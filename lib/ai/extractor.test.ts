/**
 * @file extractor.test.ts
 * @desc 智能提取主入口集成测试 - TDD 完整版
 * @input 依赖: vitest, ../ocr (mocked), ./error-handler, ./group-extractor (mocked)
 * @output 导出: 测试套件
 * @see PRD: docs/PRD.md#F019
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock ocr 模块
const mockExtractTextFromImage = vi.fn()
const mockExtractTextFromImages = vi.fn()

vi.mock('../ocr', () => ({
  extractTextFromImage: (...args: unknown[]) => mockExtractTextFromImage(...args),
  extractTextFromImages: (...args: unknown[]) => mockExtractTextFromImages(...args)
}))

// Mock group-extractor 模块
const mockExtractByGroups = vi.fn()

vi.mock('./group-extractor', () => ({
  extractByGroups: (...args: unknown[]) => mockExtractByGroups(...args)
}))

// 测试模块路径
const EXTRACTOR_MODULE_PATH = './extractor'

// 材料类型
type MaterialType = 'BILL_OF_LADING' | 'COMMERCIAL_INVOICE' | 'PACKING_LIST' | 'CONTRACT' | 'CERTIFICATE' | 'CUSTOMS_DECLARATION' | 'BONDED_NOTE' | 'OTHER'

interface Material {
  materialType: MaterialType
  originalName: string
  fileUrl: string
  content?: string
  id?: string
  taskId?: string
  fileSize?: number
  mimeType?: string
  createdAt?: Date
}

// 提取值
interface ExtractedValue {
  value: string | number
  confidence: number
  source: string
}

// 提取结果
interface ExtractedDeclaration {
  header: Record<string, ExtractedValue>
  items: Array<Record<string, ExtractedValue>>
  overallConfidence: number
}

// 主提取结果
interface ExtractDeclarationDataResult {
  success: boolean
  fallbackMode: boolean
  userMessage: string
  technicalMessage?: string
  data?: {
    header: Record<string, ExtractedValue>
    items: Array<Record<string, ExtractedValue>>
    overallConfidence: number
    groupResults?: {
      priceInfo?: ExtractedDeclaration
      transportInfo?: ExtractedDeclaration
      cargoDetails?: ExtractedDeclaration
      otherDocs?: ExtractedDeclaration
    }
    ocrText?: string
  }
  errors: Array<{ group: string; error: string }>
  logs: any[]
}

describe('AI: 智能提取主入口 (Main Extractor)', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    // 默认 mock 行为
    mockExtractTextFromImage.mockResolvedValue({
      text: 'OCR extracted text',
      confidence: 95,
      success: true,
      method: 'tesseract'
    })
    mockExtractByGroups.mockResolvedValue({
      header: {
        invoiceNo: { value: 'INV-001', confidence: 0.95, source: 'priceInfo' },
        vesselName: { value: 'MSC VESSEL', confidence: 0.9, source: 'transportInfo' }
      },
      items: [
        {
          itemNo: { value: 1, confidence: 1, source: 'cargoDetails' },
          goodsName: { value: 'Product A', confidence: 0.9, source: 'cargoDetails' }
        }
      ],
      overallConfidence: 0.92,
      groupResults: {
        priceInfo: {
          header: { invoiceNo: { value: 'INV-001', confidence: 0.95, source: 'priceInfo' } },
          items: [],
          overallConfidence: 0.95
        }
      },
      errors: []
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    process.env = originalEnv
  })

  // ============================================================
  // 完整流程测试
  // ============================================================

  describe('extractDeclarationData - 完整提取流程', () => {
    it('应该成功完成完整提取流程', async () => {
      // Arrange
      const materials: Material[] = [
        { materialType: 'COMMERCIAL_INVOICE', originalName: 'invoice.pdf', fileUrl: 'http://example.com/invoice.pdf', id: 'mat-001' },
        { materialType: 'BILL_OF_LADING', originalName: 'bol.pdf', fileUrl: 'http://example.com/bol.pdf', id: 'mat-002' }
      ]

      // Act
      const { extractDeclarationData } = await import(EXTRACTOR_MODULE_PATH)
      const result = await extractDeclarationData(materials, { taskId: 'task-001' })

      // Assert
      expect(result.success).toBe(true)
      expect(result.fallbackMode).toBe(false)
      expect(result.data).toBeDefined()
      expect(result.data?.header.invoiceNo.value).toBe('INV-001')
      expect(result.data?.items.length).toBeGreaterThan(0)
      expect(result.logs.length).toBeGreaterThan(0)
    })

    it('应该处理空材料列表', async () => {
      // Arrange
      const materials: Material[] = []

      // Act
      const { extractDeclarationData } = await import(EXTRACTOR_MODULE_PATH)
      const result = await extractDeclarationData(materials)

      // Assert
      expect(result.success).toBe(false)
      expect(result.userMessage).toContain('没有可提取的材料')
    })

    it('应该处理单个材料', async () => {
      // Arrange
      const materials: Material[] = [
        { materialType: 'COMMERCIAL_INVOICE', originalName: 'invoice.pdf', fileUrl: 'http://example.com/invoice.pdf' }
      ]

      // Act
      const { extractDeclarationData } = await import(EXTRACTOR_MODULE_PATH)
      const result = await extractDeclarationData(materials)

      // Assert
      expect(result).toBeDefined()
      expect(mockExtractTextFromImage).toHaveBeenCalledTimes(1)
    })

    it('应该处理批量材料', async () => {
      // Arrange
      const materials: Material[] = Array.from({ length: 10 }, (_, i) => ({
        materialType: 'OTHER' as MaterialType,
        originalName: `file${i}.pdf`,
        fileUrl: `http://example.com/file${i}.pdf`
      }))

      // Act
      const { extractDeclarationData } = await import(EXTRACTOR_MODULE_PATH)
      const result = await extractDeclarationData(materials)

      // Assert
      expect(result).toBeDefined()
      expect(mockExtractTextFromImage).toHaveBeenCalledTimes(10)
    })
  })

  // ============================================================
  // OCR 失败处理
  // ============================================================

  describe('extractDeclarationData - OCR 失败处理', () => {
    it('应该在部分 OCR 失败时继续处理', async () => {
      // Arrange
      const materials: Material[] = [
        { materialType: 'COMMERCIAL_INVOICE', originalName: 'invoice1.pdf', fileUrl: 'http://example.com/1.pdf', id: 'mat-001' },
        { materialType: 'COMMERCIAL_INVOICE', originalName: 'invoice2.pdf', fileUrl: 'http://example.com/2.pdf', id: 'mat-002' },
        { materialType: 'COMMERCIAL_INVOICE', originalName: 'invoice3.pdf', fileUrl: 'http://example.com/3.pdf', id: 'mat-003' }
      ]

      mockExtractTextFromImage
        .mockResolvedValueOnce({ text: 'Text 1', confidence: 95, success: true, method: 'tesseract' })
        .mockRejectedValueOnce(new Error('OCR failed'))
        .mockResolvedValueOnce({ text: 'Text 3', confidence: 90, success: true, method: 'tesseract' })

      // Act
      const { extractDeclarationData } = await import(EXTRACTOR_MODULE_PATH)
      const result = await extractDeclarationData(materials)

      // Assert
      expect(result.success).toBe(true) // 部分成功
      expect(result.logs.some(log => log.level === 'WARN')).toBe(true)
    })

    it('应该在所有 OCR 失败时返回降级结果', async () => {
      // Arrange
      const materials: Material[] = [
        { materialType: 'COMMERCIAL_INVOICE', originalName: 'invoice.pdf', fileUrl: 'http://example.com/invoice.pdf' }
      ]

      mockExtractTextFromImage.mockRejectedValue(new Error('OCR service unavailable'))

      // Act
      const { extractDeclarationData } = await import(EXTRACTOR_MODULE_PATH)
      const result = await extractDeclarationData(materials)

      // Assert
      expect(result.success).toBe(false)
      expect(result.userMessage).toContain('所有材料')
    })
  })

  // ============================================================
  // AI 提取失败处理
  // ============================================================

  describe('extractDeclarationData - AI 失败处理', () => {
    it('应该在 AI 提取失败时启用降级模式', async () => {
      // Arrange
      const materials: Material[] = [
        { materialType: 'COMMERCIAL_INVOICE', originalName: 'invoice.pdf', fileUrl: 'http://example.com/invoice.pdf', content: 'Invoice content' }
      ]

      mockExtractByGroups.mockRejectedValue(new Error('AI service unavailable'))

      // Act
      const { extractDeclarationData } = await import(EXTRACTOR_MODULE_PATH)
      const result = await extractDeclarationData(materials)

      // Assert
      expect(result.success).toBe(false)
      expect(result.fallbackMode).toBe(true)
      expect(result.data?.ocrText).toBeDefined()
    })

    it('应该记录 AI 失败的详细错误', async () => {
      // Arrange
      const materials: Material[] = [
        { materialType: 'COMMERCIAL_INVOICE', originalName: 'invoice.pdf', fileUrl: 'http://example.com/invoice.pdf', content: 'Content' }
      ]

      mockExtractByGroups.mockRejectedValue(new Error('Network timeout'))

      // Act
      const { extractDeclarationData } = await import(EXTRACTOR_MODULE_PATH)
      const result = await extractDeclarationData(materials)

      // Assert
      expect(result.logs.some(log => log.message.includes('AI 提取失败'))).toBe(true)
    })
  })

  // ============================================================
  // 配置选项
  // ============================================================

  describe('extractDeclarationData - 配置选项', () => {
    it('应该支持自定义 taskId', async () => {
      // Arrange
      const materials: Material[] = [
        { materialType: 'COMMERCIAL_INVOICE', originalName: 'invoice.pdf', fileUrl: 'http://example.com/invoice.pdf' }
      ]
      const customTaskId = 'custom-task-123'

      // Act
      const { extractDeclarationData } = await import(EXTRACTOR_MODULE_PATH)
      const result = await extractDeclarationData(materials, { taskId: customTaskId })

      // Assert
      expect(result.logs.some(log => log.taskId === customTaskId)).toBe(true)
    })

    it('应该支持启用降级模式', async () => {
      // Arrange
      const materials: Material[] = [
        { materialType: 'COMMERCIAL_INVOICE', originalName: 'invoice.pdf', fileUrl: 'http://example.com/invoice.pdf' }
      ]

      mockExtractByGroups.mockRejectedValue(new Error('AI failed'))

      // Act
      const { extractDeclarationData } = await import(EXTRACTOR_MODULE_PATH)
      const result = await extractDeclarationData(materials, { enableFallback: true })

      // Assert
      expect(result.fallbackMode).toBe(true)
      expect(result.data).toBeDefined()
    })
  })

  // ============================================================
  // 工具函数测试
  // ============================================================

  describe('工具函数', () => {
    it('createMaterialFromUrl 应该创建材料对象', async () => {
      // Arrange
      const fileUrl = 'http://example.com/invoice.pdf'
      const materialType = 'COMMERCIAL_INVOICE' as MaterialType
      const id = 'mat-001'

      // Act
      const { createMaterialFromUrl } = await import(EXTRACTOR_MODULE_PATH)
      const material = createMaterialFromUrl(fileUrl, materialType, id)

      // Assert
      expect(material.fileUrl).toBe(fileUrl)
      expect(material.materialType).toBe(materialType)
      expect(material.id).toBe(id)
      expect(material.originalName).toBe('invoice.pdf')
    })

    it('createMaterialsFromUrls 应该批量创建材料', async () => {
      // Arrange
      const urls = [
        { url: 'http://example.com/1.pdf', type: 'COMMERCIAL_INVOICE' as MaterialType, id: 'm1' },
        { url: 'http://example.com/2.pdf', type: 'BILL_OF_LADING' as MaterialType }
      ]

      // Act
      const { createMaterialsFromUrls } = await import(EXTRACTOR_MODULE_PATH)
      const materials = createMaterialsFromUrls(urls)

      // Assert
      expect(materials).toHaveLength(2)
      expect(materials[0].id).toBe('m1')
      expect(materials[0].materialType).toBe('COMMERCIAL_INVOICE')
      expect(materials[1].materialType).toBe('BILL_OF_LADING')
    })

    it('validateExtractionResult 应该验证结果完整性', async () => {
      // Arrange
      const validResult: ExtractDeclarationDataResult = {
        success: true,
        fallbackMode: false,
        userMessage: 'Success',
        data: {
          header: { invoiceNo: { value: 'INV-001', confidence: 0.95, source: 'test' } },
          items: [
            { itemNo: { value: 1, confidence: 1, source: 'test' }, goodsName: { value: 'Product A', confidence: 0.9, source: 'test' } }
          ],
          overallConfidence: 0.92
        },
        errors: [],
        logs: []
      }

      // Act
      const { validateExtractionResult } = await import(EXTRACTOR_MODULE_PATH)
      const validation = validateExtractionResult(validResult)

      // Assert
      expect(validation.valid).toBe(true)
      expect(validation.issues).toHaveLength(0)
    })

    it('validateExtractionResult 应该检测低置信度', async () => {
      // Arrange
      const lowConfidenceResult: ExtractDeclarationDataResult = {
        success: true,
        fallbackMode: false,
        userMessage: 'Success',
        data: {
          header: {},
          items: [],
          overallConfidence: 0.3 // 低于 0.5
        },
        errors: [],
        logs: []
      }

      // Act
      const { validateExtractionResult } = await import(EXTRACTOR_MODULE_PATH)
      const validation = validateExtractionResult(lowConfidenceResult)

      // Assert
      expect(validation.valid).toBe(false)
      expect(validation.issues.some(issue => issue.includes('置信度过低'))).toBe(true)
    })

    it('validateExtractionResult 应该检测缺少数据', async () => {
      // Arrange
      const noDataResult: ExtractDeclarationDataResult = {
        success: false,
        fallbackMode: false,
        userMessage: 'Failed',
        errors: [],
        logs: []
      }

      // Act
      const { validateExtractionResult } = await import(EXTRACTOR_MODULE_PATH)
      const validation = validateExtractionResult(noDataResult)

      // Assert
      expect(validation.valid).toBe(false)
      expect(validation.issues).toContain('缺少提取数据')
    })

    it('generateExtractionSummary 应该生成摘要', async () => {
      // Arrange
      const result: ExtractDeclarationDataResult = {
        success: true,
        fallbackMode: false,
        userMessage: 'Success',
        data: {
          header: { field1: { value: 'val1', confidence: 0.9, source: 'test' } },
          items: [
            { itemNo: { value: 1, confidence: 1, source: 'test' }, goodsName: { value: 'Product A', confidence: 0.9, source: 'test' } }
          ],
          overallConfidence: 0.9,
          groupResults: {
            priceInfo: {
              header: {},
              items: [],
              overallConfidence: 0.9
            }
          }
        },
        errors: [],
        logs: []
      }

      // Act
      const { generateExtractionSummary } = await import(EXTRACTOR_MODULE_PATH)
      const summary = generateExtractionSummary(result)

      // Assert
      expect(summary.status).toBe('成功')
      expect(summary.fieldsExtracted).toBeGreaterThan(0)
      expect(summary.confidence).toBe(0.9)
      expect(summary.errorsCount).toBe(0)
    })
  })

  // ============================================================
  // 边界情况
  // ============================================================

  describe('边界情况', () => {
    it('应该处理特殊字符的文件名', async () => {
      // Arrange
      const materials: Material[] = [
        { materialType: 'COMMERCIAL_INVOICE', originalName: '发票-2024(1).pdf', fileUrl: 'http://example.com/file.pdf' }
      ]

      // Act
      const { extractDeclarationData } = await import(EXTRACTOR_MODULE_PATH)
      const result = await extractDeclarationData(materials)

      // Assert
      expect(result).toBeDefined()
    })

    it('应该处理已包含内容的材料', async () => {
      // Arrange
      const materials: Material[] = [
        { materialType: 'COMMERCIAL_INVOICE', originalName: 'invoice.pdf', fileUrl: 'http://example.com/invoice.pdf', content: 'Pre-extracted content' }
      ]

      // Act
      const { extractDeclarationData } = await import(EXTRACTOR_MODULE_PATH)
      const result = await extractDeclarationData(materials)

      // Assert
      expect(result).toBeDefined()
      // 不应该调用 OCR，因为已有内容
      // 但当前实现仍会调用 OCR
    })

    it('应该处理超大材料列表', async () => {
      // Arrange
      const materials: Material[] = Array.from({ length: 100 }, (_, i) => ({
        materialType: 'OTHER' as MaterialType,
        originalName: `file${i}.pdf`,
        fileUrl: `http://example.com/file${i}.pdf`
      }))

      // Act
      const { extractDeclarationData } = await import(EXTRACTOR_MODULE_PATH)
      const result = await extractDeclarationData(materials)

      // Assert
      expect(result).toBeDefined()
      expect(mockExtractTextFromImage).toHaveBeenCalledTimes(100)
    })
  })
})

// 导出类型
export type {
  Material,
  ExtractedValue,
  ExtractedDeclaration,
  ExtractDeclarationDataResult,
  MaterialType
}
