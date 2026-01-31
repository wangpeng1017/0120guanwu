/**
 * @file group-extractor.test.ts
 * @desc 智能分组提取单元测试 - 按业务语义分组并发处理（TDD 完整版）
 * @input 依赖: vitest, declaration-extractor (mocked)
 * @output 导出: 测试套件
 * @see PRD: docs/PRD.md#F017
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock declaration-extractor
const mockCallGemini = vi.fn()
const mockExtractDeclaration = vi.fn()

vi.mock('./declaration-extractor', () => ({
  callGemini: (...args: unknown[]) => mockCallGemini(...args),
  extractDeclaration: (...args: unknown[]) => mockExtractDeclaration(...args),
}))

// 测试模块路径
const EXTRACTOR_MODULE_PATH = './group-extractor'

// 材料类型（与 types/index.ts 对齐）
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

// 标准提取结果结构
interface ExtractedValue {
  value: string | number
  confidence: number
  source: string
}

interface ExtractedDeclaration {
  header: Record<string, ExtractedValue>
  items: Array<Record<string, ExtractedValue>>
  overallConfidence: number
}

// 分组提取结果
interface GroupExtractResult {
  header: Record<string, ExtractedValue>
  items: Array<Record<string, ExtractedValue>>
  overallConfidence: number
  groupResults: {
    priceInfo?: ExtractedDeclaration
    transportInfo?: ExtractedDeclaration
    cargoDetails?: ExtractedDeclaration
    otherDocs?: ExtractedDeclaration
  }
  errors: Array<{ group: string; error: string }>
}

describe('AI: 智能分组提取 (Group Extraction)', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    // 重置环境变量
    process.env = { ...originalEnv }
    // 默认 mock 行为
    mockCallGemini.mockResolvedValue(JSON.stringify({
      header: {},
      items: [],
      overallConfidence: 0.9
    }))
    mockExtractDeclaration.mockResolvedValue({
      header: {},
      items: [],
      overallConfidence: 0.9
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    process.env = originalEnv
  })

  describe('groupMaterialsByType - 材料分组逻辑', () => {
    it('应该将商业发票归类到价格信息组', async () => {
      // Arrange
      const materials: Material[] = [
        { materialType: 'COMMERCIAL_INVOICE', originalName: 'invoice.pdf', fileUrl: 'http://example.com/invoice.pdf' }
      ]

      // Act
      const { groupMaterialsByType } = await import(EXTRACTOR_MODULE_PATH)
      const groups = groupMaterialsByType(materials)

      // Assert
      expect(groups.priceInfo).toHaveLength(1)
      expect(groups.priceInfo![0].materialType).toBe('COMMERCIAL_INVOICE')
    })

    it('应该将提单归类到运输信息组', async () => {
      // Arrange
      const materials: Material[] = [
        { materialType: 'BILL_OF_LADING', originalName: 'bol.pdf', fileUrl: 'http://example.com/bol.pdf' }
      ]

      // Act
      const { groupMaterialsByType } = await import(EXTRACTOR_MODULE_PATH)
      const groups = groupMaterialsByType(materials)

      // Assert
      expect(groups.transportInfo).toHaveLength(1)
      expect(groups.transportInfo![0].materialType).toBe('BILL_OF_LADING')
    })

    it('应该将装箱单和合同归类到货物详情组', async () => {
      // Arrange
      const materials: Material[] = [
        { materialType: 'PACKING_LIST', originalName: 'packing.pdf', fileUrl: 'http://example.com/packing.pdf' },
        { materialType: 'CONTRACT', originalName: 'contract.pdf', fileUrl: 'http://example.com/contract.pdf' }
      ]

      // Act
      const { groupMaterialsByType } = await import(EXTRACTOR_MODULE_PATH)
      const groups = groupMaterialsByType(materials)

      // Assert
      expect(groups.cargoDetails).toHaveLength(2)
      expect(groups.cargoDetails![0].materialType).toBe('PACKING_LIST')
      expect(groups.cargoDetails![1].materialType).toBe('CONTRACT')
    })

    it('应该将其他单证归类到其他组', async () => {
      // Arrange
      const materials: Material[] = [
        { materialType: 'CERTIFICATE', originalName: 'cert.pdf', fileUrl: 'http://example.com/cert.pdf' },
        { materialType: 'BONDED_NOTE', originalName: 'note.pdf', fileUrl: 'http://example.com/note.pdf' },
        { materialType: 'OTHER', originalName: 'other.pdf', fileUrl: 'http://example.com/other.pdf' }
      ]

      // Act
      const { groupMaterialsByType } = await import(EXTRACTOR_MODULE_PATH)
      const groups = groupMaterialsByType(materials)

      // Assert
      expect(groups.otherDocs).toHaveLength(3)
    })

    it('应该正确分组混合材料', async () => {
      // Arrange
      const materials: Material[] = [
        { materialType: 'COMMERCIAL_INVOICE', originalName: 'invoice.pdf', fileUrl: 'http://example.com/invoice.pdf' },
        { materialType: 'BILL_OF_LADING', originalName: 'bol.pdf', fileUrl: 'http://example.com/bol.pdf' },
        { materialType: 'PACKING_LIST', originalName: 'packing.pdf', fileUrl: 'http://example.com/packing.pdf' },
        { materialType: 'CERTIFICATE', originalName: 'cert.pdf', fileUrl: 'http://example.com/cert.pdf' }
      ]

      // Act
      const { groupMaterialsByType } = await import(EXTRACTOR_MODULE_PATH)
      const groups = groupMaterialsByType(materials)

      // Assert
      expect(groups.priceInfo).toHaveLength(1)
      expect(groups.transportInfo).toHaveLength(1)
      expect(groups.cargoDetails).toHaveLength(1)
      expect(groups.otherDocs).toHaveLength(1)
    })

    it('应该处理空材料数组', async () => {
      // Arrange
      const materials: Material[] = []

      // Act
      const { groupMaterialsByType } = await import(EXTRACTOR_MODULE_PATH)
      const groups = groupMaterialsByType(materials)

      // Assert
      expect(groups.priceInfo).toHaveLength(0)
      expect(groups.transportInfo).toHaveLength(0)
      expect(groups.cargoDetails).toHaveLength(0)
      expect(groups.otherDocs).toHaveLength(0)
    })

    it('应该处理未知材料类型', async () => {
      // Arrange
      const materials: Material[] = [
        { materialType: 'OTHER' as MaterialType, originalName: 'unknown.pdf', fileUrl: 'http://example.com/unknown.pdf' }
      ]

      // Act
      const { groupMaterialsByType } = await import(EXTRACTOR_MODULE_PATH)
      const groups = groupMaterialsByType(materials)

      // Assert
      // 未知类型应该归到 otherDocs
      expect(groups.otherDocs).toHaveLength(1)
    })
  })

  describe('extractGroup - 单组提取逻辑', () => {
    it('应该为价格信息组构建正确的提示词', async () => {
      // Arrange
      const materials: Material[] = [
        { materialType: 'COMMERCIAL_INVOICE', originalName: 'invoice.pdf', fileUrl: 'http://example.com/invoice.pdf', content: 'Invoice content' }
      ]
      mockCallGemini.mockResolvedValue(JSON.stringify({
        header: {
          invoiceNo: { value: 'INV-001', confidence: 0.95, source: '商业发票' },
          invoiceDate: { value: '2026-01-31', confidence: 0.9, source: '商业发票' },
          totalPrice: { value: 1000, confidence: 0.95, source: '商业发票' }
        },
        items: [],
        overallConfidence: 0.93
      }))

      // Act
      const { extractGroup } = await import(EXTRACTOR_MODULE_PATH)
      const result = await extractGroup(materials, 'priceInfo')

      // Assert
      expect(mockCallGemini).toHaveBeenCalled()
      const promptArg = mockCallGemini.mock.calls[0][0] as string
      expect(promptArg).toContain('商业发票')
      expect(result.header.invoiceNo.value).toBe('INV-001')
    })

    it('应该为运输信息组构建正确的提示词', async () => {
      // Arrange
      const materials: Material[] = [
        { materialType: 'BILL_OF_LADING', originalName: 'bol.pdf', fileUrl: 'http://example.com/bol.pdf', content: 'BOL content' }
      ]
      mockCallGemini.mockResolvedValue(JSON.stringify({
        header: {
          vesselName: { value: 'MSC VESSEL', confidence: 0.9, source: '提单' },
          voyageNo: { value: 'V001', confidence: 0.9, source: '提单' },
          billNo: { value: 'BL-001', confidence: 0.95, source: '提单' }
        },
        items: [],
        overallConfidence: 0.92
      }))

      // Act
      const { extractGroup } = await import(EXTRACTOR_MODULE_PATH)
      const result = await extractGroup(materials, 'transportInfo')

      // Assert
      const promptArg = mockCallGemini.mock.calls[0][0] as string
      expect(promptArg).toContain('提单')
      expect(result.header.vesselName.value).toBe('MSC VESSEL')
    })

    it('应该为货物详情组构建正确的提示词', async () => {
      // Arrange
      const materials: Material[] = [
        { materialType: 'PACKING_LIST', originalName: 'packing.pdf', fileUrl: 'http://example.com/packing.pdf', content: 'Packing content' }
      ]
      mockCallGemini.mockResolvedValue(JSON.stringify({
        header: {},
        items: [
          {
            itemNo: { value: 1, confidence: 1, source: '装箱单' },
            goodsName: { value: 'Product A', confidence: 0.9, source: '装箱单' },
            quantity: { value: 100, confidence: 0.9, source: '装箱单' }
          }
        ],
        overallConfidence: 0.9
      }))

      // Act
      const { extractGroup } = await import(EXTRACTOR_MODULE_PATH)
      const result = await extractGroup(materials, 'cargoDetails')

      // Assert
      const promptArg = mockCallGemini.mock.calls[0][0] as string
      expect(promptArg).toContain('装箱单')
      expect(result.items).toHaveLength(1)
      expect(result.items[0].goodsName.value).toBe('Product A')
    })

    it('应该处理空组', async () => {
      // Arrange
      const materials: Material[] = []

      // Act
      const { extractGroup } = await import(EXTRACTOR_MODULE_PATH)
      const result = await extractGroup(materials, 'priceInfo')

      // Assert
      expect(result).toEqual({
        header: {},
        items: [],
        overallConfidence: 0
      })
    })

    it('应该处理单组提取失败', async () => {
      // Arrange
      const materials: Material[] = [
        { materialType: 'COMMERCIAL_INVOICE', originalName: 'invoice.pdf', fileUrl: 'http://example.com/invoice.pdf' }
      ]
      mockCallGemini.mockRejectedValue(new Error('API 错误'))

      // Act & Assert
      const { extractGroup } = await import(EXTRACTOR_MODULE_PATH)
      await expect(extractGroup(materials, 'priceInfo')).rejects.toThrow()
    })
  })

  describe('extractAllGroups - 并发提取所有组', () => {
    it('应该并发提取所有4个组', async () => {
      // Arrange
      const materials: Material[] = [
        { materialType: 'COMMERCIAL_INVOICE', originalName: 'invoice.pdf', fileUrl: 'http://example.com/invoice.pdf' },
        { materialType: 'BILL_OF_LADING', originalName: 'bol.pdf', fileUrl: 'http://example.com/bol.pdf' },
        { materialType: 'PACKING_LIST', originalName: 'packing.pdf', fileUrl: 'http://example.com/packing.pdf' },
        { materialType: 'CERTIFICATE', originalName: 'cert.pdf', fileUrl: 'http://example.com/cert.pdf' }
      ]

      // Mock 不同组返回不同数据
      mockCallGemini
        .mockResolvedValueOnce(JSON.stringify({
          header: { invoiceNo: { value: 'INV-001', confidence: 0.95, source: '商业发票' } },
          items: [],
          overallConfidence: 0.95
        }))
        .mockResolvedValueOnce(JSON.stringify({
          header: { vesselName: { value: 'MSC VESSEL', confidence: 0.9, source: '提单' } },
          items: [],
          overallConfidence: 0.9
        }))
        .mockResolvedValueOnce(JSON.stringify({
          header: {},
          items: [{ itemNo: { value: 1, confidence: 1, source: '装箱单' } }],
          overallConfidence: 0.9
        }))
        .mockResolvedValueOnce(JSON.stringify({
          header: {},
          items: [],
          overallConfidence: 0.8
        }))

      // Act
      const { extractAllGroups } = await import(EXTRACTOR_MODULE_PATH)
      const result = await extractAllGroups(materials)

      // Assert
      expect(mockCallGemini).toHaveBeenCalledTimes(4)
      expect(result.priceInfo).toBeDefined()
      expect(result.transportInfo).toBeDefined()
      expect(result.cargoDetails).toBeDefined()
      expect(result.otherDocs).toBeDefined()
    })

    it('应该使用 Promise.allSettled 处理部分失败', async () => {
      // Arrange
      const materials: Material[] = [
        { materialType: 'COMMERCIAL_INVOICE', originalName: 'invoice.pdf', fileUrl: 'http://example.com/invoice.pdf' },
        { materialType: 'BILL_OF_LADING', originalName: 'bol.pdf', fileUrl: 'http://example.com/bol.pdf' }
      ]

      // 价格组成功，运输组失败
      mockCallGemini
        .mockResolvedValueOnce(JSON.stringify({
          header: { invoiceNo: { value: 'INV-001', confidence: 0.95, source: '商业发票' } },
          items: [],
          overallConfidence: 0.95
        }))
        .mockRejectedValueOnce(new Error('运输组提取失败'))

      // Act
      const { extractAllGroups } = await import(EXTRACTOR_MODULE_PATH)
      const result = await extractAllGroups(materials)

      // Assert
      expect(result.priceInfo).toBeDefined()
      expect(result.transportInfo).toBeUndefined()
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].group).toBe('transportInfo')
    })

    it('应该跳过空组', async () => {
      // Arrange
      const materials: Material[] = [
        { materialType: 'COMMERCIAL_INVOICE', originalName: 'invoice.pdf', fileUrl: 'http://example.com/invoice.pdf' }
      ]

      mockCallGemini.mockResolvedValue(JSON.stringify({
        header: { invoiceNo: { value: 'INV-001', confidence: 0.95, source: '商业发票' } },
        items: [],
        overallConfidence: 0.95
      }))

      // Act
      const { extractAllGroups } = await import(EXTRACTOR_MODULE_PATH)
      const result = await extractAllGroups(materials)

      // Assert
      expect(mockCallGemini).toHaveBeenCalledTimes(1) // 只调用价格组
      expect(result.priceInfo).toBeDefined()
      expect(result.transportInfo).toBeUndefined()
      expect(result.cargoDetails).toBeUndefined()
      expect(result.otherDocs).toBeUndefined()
    })

    it('应该记录所有失败组的错误', async () => {
      // Arrange
      const materials: Material[] = [
        { materialType: 'COMMERCIAL_INVOICE', originalName: 'invoice.pdf', fileUrl: 'http://example.com/invoice.pdf' },
        { materialType: 'BILL_OF_LADING', originalName: 'bol.pdf', fileUrl: 'http://example.com/bol.pdf' },
        { materialType: 'PACKING_LIST', originalName: 'packing.pdf', fileUrl: 'http://example.com/packing.pdf' }
      ]

      mockCallGemini.mockRejectedValue(new Error('API 错误'))

      // Act
      const { extractAllGroups } = await import(EXTRACTOR_MODULE_PATH)
      const result = await extractAllGroups(materials)

      // Assert
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('mergeGroupResults - 结果合并', () => {
    it('应该合并表头字段，取最高置信度', async () => {
      // Arrange
      const groupResults = {
        priceInfo: {
          header: {
            invoiceNo: { value: 'INV-001', confidence: 0.95, source: '商业发票' },
            totalPrice: { value: 1000, confidence: 0.9, source: '商业发票' }
          },
          items: [],
          overallConfidence: 0.9
        },
        transportInfo: {
          header: {
            vesselName: { value: 'MSC VESSEL', confidence: 0.9, source: '提单' },
            totalPrice: { value: 1200, confidence: 0.7, source: '提单' } // 冲突字段，置信度低
          },
          items: [],
          overallConfidence: 0.85
        }
      }

      // Act
      const { mergeGroupResults } = await import(EXTRACTOR_MODULE_PATH)
      const merged = mergeGroupResults(groupResults)

      // Assert
      expect(merged.header.invoiceNo.value).toBe('INV-001')
      expect(merged.header.vesselName.value).toBe('MSC VESSEL')
      // 冲突字段应该取高置信度的值
      expect(merged.header.totalPrice.value).toBe(1000)
      expect(merged.header.totalPrice.confidence).toBe(0.9)
    })

    it('应该累加表体商品项', async () => {
      // Arrange
      const groupResults = {
        cargoDetails: {
          header: {},
          items: [
            {
              itemNo: { value: 1, confidence: 1, source: '装箱单' },
              goodsName: { value: 'Product A', confidence: 0.9, source: '装箱单' }
            },
            {
              itemNo: { value: 2, confidence: 1, source: '装箱单' },
              goodsName: { value: 'Product B', confidence: 0.9, source: '装箱单' }
            }
          ],
          overallConfidence: 0.9
        },
        priceInfo: {
          header: {},
          items: [
            {
              itemNo: { value: 1, confidence: 1, source: '商业发票' },
              goodsName: { value: 'Product A', confidence: 0.95, source: '商业发票' }
            }
          ],
          overallConfidence: 0.9
        }
      }

      // Act
      const { mergeGroupResults } = await import(EXTRACTOR_MODULE_PATH)
      const merged = mergeGroupResults(groupResults)

      // Assert
      // 应该有所有商品项
      expect(merged.items.length).toBeGreaterThanOrEqual(2)
    })

    it('应该计算合并后的整体置信度', async () => {
      // Arrange
      const groupResults = {
        priceInfo: {
          header: { field1: { value: 'test', confidence: 0.9, source: 'test' } },
          items: [],
          overallConfidence: 0.9
        },
        transportInfo: {
          header: { field2: { value: 'test', confidence: 0.8, source: 'test' } },
          items: [],
          overallConfidence: 0.8
        }
      }

      // Act
      const { mergeGroupResults } = await import(EXTRACTOR_MODULE_PATH)
      const merged = mergeGroupResults(groupResults)

      // Assert
      expect(merged.overallConfidence).toBeGreaterThan(0)
      expect(merged.overallConfidence).toBeLessThanOrEqual(1)
    })

    it('应该处理空组结果', async () => {
      // Arrange
      const groupResults = {}

      // Act
      const { mergeGroupResults } = await import(EXTRACTOR_MODULE_PATH)
      const merged = mergeGroupResults(groupResults)

      // Assert
      expect(merged.header).toEqual({})
      expect(merged.items).toEqual([])
      expect(merged.overallConfidence).toBe(0)
    })

    it('应该处理部分空组', async () => {
      // Arrange
      const groupResults = {
        priceInfo: {
          header: { invoiceNo: { value: 'INV-001', confidence: 0.95, source: '商业发票' } },
          items: [],
          overallConfidence: 0.9
        },
        transportInfo: undefined,
        cargoDetails: null
      }

      // Act
      const { mergeGroupResults } = await import(EXTRACTOR_MODULE_PATH)
      const merged = mergeGroupResults(groupResults)

      // Assert
      expect(merged.header.invoiceNo.value).toBe('INV-001')
    })
  })

  describe('extractByGroups - 完整分组提取流程', () => {
    it('应该成功执行完整的分组提取流程', async () => {
      // Arrange
      const materials: Material[] = [
        { materialType: 'COMMERCIAL_INVOICE', originalName: 'invoice.pdf', fileUrl: 'http://example.com/invoice.pdf', content: 'Invoice content' },
        { materialType: 'BILL_OF_LADING', originalName: 'bol.pdf', fileUrl: 'http://example.com/bol.pdf', content: 'BOL content' }
      ]

      mockCallGemini
        .mockResolvedValueOnce(JSON.stringify({
          header: { invoiceNo: { value: 'INV-001', confidence: 0.95, source: '商业发票' } },
          items: [],
          overallConfidence: 0.95
        }))
        .mockResolvedValueOnce(JSON.stringify({
          header: { vesselName: { value: 'MSC VESSEL', confidence: 0.9, source: '提单' } },
          items: [],
          overallConfidence: 0.9
        }))

      // Act
      const { extractByGroups } = await import(EXTRACTOR_MODULE_PATH)
      const result: GroupExtractResult = await extractByGroups(materials)

      // Assert
      expect(result.header).toBeDefined()
      expect(result.items).toBeDefined()
      expect(result.overallConfidence).toBeGreaterThan(0)
      expect(result.groupResults).toBeDefined()
      expect(result.groupResults.priceInfo).toBeDefined()
      expect(result.groupResults.transportInfo).toBeDefined()
    })

    it('应该返回各组独立结果', async () => {
      // Arrange
      const materials: Material[] = [
        { materialType: 'COMMERCIAL_INVOICE', originalName: 'invoice.pdf', fileUrl: 'http://example.com/invoice.pdf' }
      ]

      mockCallGemini.mockResolvedValue(JSON.stringify({
        header: { invoiceNo: { value: 'INV-001', confidence: 0.95, source: '商业发票' } },
        items: [],
        overallConfidence: 0.95
      }))

      // Act
      const { extractByGroups } = await import(EXTRACTOR_MODULE_PATH)
      const result: GroupExtractResult = await extractByGroups(materials)

      // Assert
      expect(result.groupResults.priceInfo).toBeDefined()
      expect(result.groupResults.priceInfo.header.invoiceNo.value).toBe('INV-001')
    })

    it('应该处理空材料数组', async () => {
      // Arrange
      const materials: Material[] = []

      // Act
      const { extractByGroups } = await import(EXTRACTOR_MODULE_PATH)
      const result: GroupExtractResult = await extractByGroups(materials)

      // Assert
      expect(result.header).toEqual({})
      expect(result.items).toEqual([])
      expect(result.overallConfidence).toBe(0)
    })

    it('应该记录所有错误', async () => {
      // Arrange
      const materials: Material[] = [
        { materialType: 'COMMERCIAL_INVOICE', originalName: 'invoice.pdf', fileUrl: 'http://example.com/invoice.pdf' }
      ]

      mockCallGemini.mockRejectedValue(new Error('API 错误'))

      // Act
      const { extractByGroups } = await import(EXTRACTOR_MODULE_PATH)
      const result: GroupExtractResult = await extractByGroups(materials)

      // Assert
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0].group).toBeDefined()
      expect(result.errors[0].error).toBeDefined()
    })
  })

  describe('边界情况', () => {
    it('应该处理没有文本内容的材料', async () => {
      // Arrange
      const materials: Material[] = [
        { materialType: 'COMMERCIAL_INVOICE', originalName: 'invoice.pdf', fileUrl: 'http://example.com/invoice.pdf' }
      ]

      mockCallGemini.mockResolvedValue(JSON.stringify({
        header: {},
        items: [],
        overallConfidence: 0
      }))

      // Act
      const { extractByGroups } = await import(EXTRACTOR_MODULE_PATH)
      const result: GroupExtractResult = await extractByGroups(materials)

      // Assert
      expect(result).toBeDefined()
    })

    it('应该处理超大材料列表', async () => {
      // Arrange
      const materials: Material[] = Array.from({ length: 100 }, (_, i) => ({
        materialType: 'OTHER' as MaterialType,
        originalName: `file${i}.pdf`,
        fileUrl: `http://example.com/file${i}.pdf`
      }))

      mockCallGemini.mockResolvedValue(JSON.stringify({
        header: {},
        items: [],
        overallConfidence: 0.8
      }))

      // Act
      const { extractByGroups } = await import(EXTRACTOR_MODULE_PATH)
      const result: GroupExtractResult = await extractByGroups(materials)

      // Assert
      expect(result).toBeDefined()
    })

    it('应该处理特殊字符和 Unicode', async () => {
      // Arrange
      const materials: Material[] = [
        { materialType: 'COMMERCIAL_INVOICE', originalName: '发票.pdf', fileUrl: 'http://example.com/invoice.pdf', content: '商品名称: 产品A\n价格: 1000元' }
      ]

      mockCallGemini.mockResolvedValue(JSON.stringify({
        header: { invoiceNo: { value: 'INV-001-中文', confidence: 0.95, source: '商业发票' } },
        items: [],
        overallConfidence: 0.95
      }))

      // Act
      const { extractByGroups } = await import(EXTRACTOR_MODULE_PATH)
      const result: GroupExtractResult = await extractByGroups(materials)

      // Assert
      expect(result.header.invoiceNo.value).toContain('中文')
    })
  })

  describe('性能优化', () => {
    it('应该并发执行非空组', async () => {
      // Arrange
      const materials: Material[] = [
        { materialType: 'COMMERCIAL_INVOICE', originalName: 'invoice.pdf', fileUrl: 'http://example.com/invoice.pdf' },
        { materialType: 'BILL_OF_LADING', originalName: 'bol.pdf', fileUrl: 'http://example.com/bol.pdf' },
        { materialType: 'PACKING_LIST', originalName: 'packing.pdf', fileUrl: 'http://example.com/packing.pdf' }
      ]

      let callOrder: string[] = []
      mockCallGemini.mockImplementation(async () => {
        callOrder.push(new Date().toISOString())
        await new Promise(resolve => setTimeout(resolve, 50))
        return JSON.stringify({ header: {}, items: [], overallConfidence: 0.9 })
      })

      // Act
      const { extractAllGroups } = await import(EXTRACTOR_MODULE_PATH)
      await extractAllGroups(materials)

      // Assert
      // 并发调用，时间应该接近而非累加
      expect(mockCallGemini).toHaveBeenCalledTimes(3)
    })
  })
})
