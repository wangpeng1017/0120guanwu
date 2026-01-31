/**
 * @file tesseract.test.ts
 * @desc Tesseract OCR 单元测试 - TDD 完整版
 * @input 依赖: vitest, tesseract.js (mocked)
 * @output 导出: 测试套件
 * @see PRD: docs/PRD.md#F016
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs/promises'
import path from 'path'

// Mock tesseract.js
const mockRecognize = vi.fn()
vi.mock('tesseract.js', () => ({
  default: {
    recognize: mockRecognize
  }
}))

// Mock fs/promises
const mockMkdir = vi.fn()
const mockWriteFile = vi.fn()
const mockUnlink = vi.fn()
const mockAccess = vi.fn()

vi.mock('fs/promises', () => ({
  default: {
    mkdir: mockMkdir,
    writeFile: mockWriteFile,
    unlink: mockUnlink,
    access: mockAccess
  },
  // 保持命名导出
  mkdir: mockMkdir,
  writeFile: mockWriteFile,
  unlink: mockUnlink,
  access: mockAccess
}))

// 待实现的模块路径
const OCR_MODULE_PATH = './tesseract'

describe('OCR: Tesseract 文本提取', () => {
  const testImageDir = path.join(process.cwd(), 'tests', 'fixtures', 'images')

  beforeEach(() => {
    vi.clearAllMocks()
    // 默认 mock 行为
    mockMkdir.mockResolvedValue(undefined)
    mockWriteFile.mockResolvedValue(undefined)
    mockUnlink.mockResolvedValue(undefined)
    mockAccess.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('extractTextFromImage - 基础功能', () => {
    it('应该从图片文件路径中提取文本', async () => {
      // Arrange
      const imagePath = path.join(testImageDir, 'invoice.png')
      const expectedText = '发票号码: INV-2024-001\n金额: $10,000.00'
      mockRecognize.mockResolvedValue({
        data: { text: expectedText, confidence: 95 }
      })

      // Act
      const { extractTextFromImage } = await import(OCR_MODULE_PATH)
      const result = await extractTextFromImage(imagePath)

      // Assert
      expect(result).toBeDefined()
      expect(result.text).toBe(expectedText)
      expect(result.confidence).toBe(95)
      expect(result.success).toBe(true)
      expect(result.method).toBe('tesseract')
      expect(mockRecognize).toHaveBeenCalledTimes(1)
    })

    it('应该从 Buffer 中提取文本', async () => {
      // Arrange
      const imageBuffer = Buffer.from('fake image data')
      const expectedText = '提单号: BOL-123456'
      mockRecognize.mockResolvedValue({
        data: { text: expectedText, confidence: 88 }
      })

      // Act
      const { extractTextFromImage } = await import(OCR_MODULE_PATH)
      const result = await extractTextFromImage(imageBuffer)

      // Assert
      expect(result.text).toBe(expectedText)
      expect(result.confidence).toBe(88)
      // Buffer 会被写入临时文件
      expect(mockWriteFile).toHaveBeenCalled()
    })

    it('应该从 URL 中提取文本', async () => {
      // Arrange
      const imageUrl = 'https://example.com/invoice.jpg'
      const expectedText = '合同编号: CT-2024-001'
      mockRecognize.mockResolvedValue({
        data: { text: expectedText, confidence: 92 }
      })

      // Act
      const { extractTextFromImage } = await import(OCR_MODULE_PATH)
      const result = await extractTextFromImage(imageUrl)

      // Assert
      expect(result.text).toBe(expectedText)
      expect(result.success).toBe(true)
    })
  })

  describe('extractTextFromImage - 语言支持', () => {
    it('应该支持中英文混合识别', async () => {
      // Arrange
      const imagePath = path.join(testImageDir, 'mixed-text.png')
      const expectedText = '商业发票 Commercial Invoice\n编号: INV-001 No: INV-001'
      mockRecognize.mockResolvedValue({
        data: { text: expectedText, confidence: 90 }
      })

      // Act
      const { extractTextFromImage } = await import(OCR_MODULE_PATH)
      const result = await extractTextFromImage(imagePath, { languages: ['chi_sim', 'eng'] })

      // Assert
      expect(result.text).toContain('商业发票')
      expect(result.text).toContain('Commercial Invoice')
      expect(mockRecognize).toHaveBeenCalledWith(
        imagePath,
        'chi_sim+eng',
        expect.any(Object)
      )
    })

    it('应该默认使用中文简体和英文', async () => {
      // Arrange
      const imagePath = path.join(testImageDir, 'default.png')
      mockRecognize.mockResolvedValue({
        data: { text: '测试 text', confidence: 85 }
      })

      // Act
      const { extractTextFromImage } = await import(OCR_MODULE_PATH)
      await extractTextFromImage(imagePath)

      // Assert
      expect(mockRecognize).toHaveBeenCalledWith(
        imagePath,
        'chi_sim+eng',
        expect.any(Object)
      )
    })
  })

  describe('extractTextFromImage - 错误处理', () => {
    it('应该处理文件不存在错误', async () => {
      // Arrange
      const notExistPath = '/path/does/not/exist.png'
      mockRecognize.mockRejectedValue(new Error('File not found'))

      // Act & Assert
      const { extractTextFromImage } = await import(OCR_MODULE_PATH)
      await expect(extractTextFromImage(notExistPath)).rejects.toThrow()
    })

    it('应该处理空文件错误', async () => {
      // Arrange
      const emptyPath = path.join(testImageDir, 'empty.png')
      mockRecognize.mockResolvedValue({
        data: { text: '', confidence: 0 }
      })

      // Act
      const { extractTextFromImage } = await import(OCR_MODULE_PATH)
      const result = await extractTextFromImage(emptyPath)

      // Assert
      expect(result.text).toBe('')
      expect(result.isEmpty).toBe(true)
    })

    it('应该处理 Tesseract 识别失败', async () => {
      // Arrange
      const imagePath = path.join(testImageDir, 'corrupt.png')
      mockRecognize.mockRejectedValue(new Error('Tesseract recognition failed'))

      // Act & Assert
      const { extractTextFromImage } = await import(OCR_MODULE_PATH)
      await expect(extractTextFromImage(imagePath)).rejects.toThrow()
    })

    it('应该当 Tesseract 不可用时返回降级结果', async () => {
      // Arrange
      const imagePath = path.join(testImageDir, 'fallback.png')
      mockRecognize.mockRejectedValue(new Error('Tesseract not installed'))

      // Act
      const { extractTextFromImage } = await import(OCR_MODULE_PATH)
      const result = await extractTextFromImage(imagePath, { fallback: true })

      // Assert
      expect(result.method).toBe('fallback')
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('extractTextFromImages - 批量处理', () => {
    it('应该按顺序处理多张图片', async () => {
      // Arrange
      const imagePaths = [
        path.join(testImageDir, 'page1.png'),
        path.join(testImageDir, 'page2.png'),
        path.join(testImageDir, 'page3.png')
      ]
      mockRecognize
        .mockResolvedValueOnce({ data: { text: 'Page 1', confidence: 95 } })
        .mockResolvedValueOnce({ data: { text: 'Page 2', confidence: 92 } })
        .mockResolvedValueOnce({ data: { text: 'Page 3', confidence: 98 } })

      // Act
      const { extractTextFromImages } = await import(OCR_MODULE_PATH)
      const results = await extractTextFromImages(imagePaths)

      // Assert
      expect(results).toHaveLength(3)
      expect(results[0].text).toBe('Page 1')
      expect(results[1].text).toBe('Page 2')
      expect(results[2].text).toBe('Page 3')
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(true)
      expect(results[2].success).toBe(true)
    })

    it('应该支持并发处理多张图片', async () => {
      // Arrange
      const imagePaths = [
        path.join(testImageDir, 'page1.png'),
        path.join(testImageDir, 'page2.png')
      ]
      mockRecognize.mockResolvedValue({ data: { text: 'Concurrent', confidence: 90 } })

      // Act
      const { extractTextFromImages } = await import(OCR_MODULE_PATH)
      const results = await extractTextFromImages(imagePaths, { concurrent: true })

      // Assert
      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(true)
    })

    it('应该在批量处理时继续处理失败的图片', async () => {
      // Arrange
      const imagePaths = [
        path.join(testImageDir, 'ok.png'),
        path.join(testImageDir, 'fail.png'),
        path.join(testImageDir, 'ok2.png')
      ]
      mockRecognize
        .mockResolvedValueOnce({ data: { text: 'OK', confidence: 95 } })
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ data: { text: 'OK2', confidence: 90 } })

      // Act
      const { extractTextFromImages } = await import(OCR_MODULE_PATH)
      const results = await extractTextFromImages(imagePaths, { continueOnError: true })

      // Assert
      expect(results).toHaveLength(3)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
      expect(results[2].success).toBe(true)
    })
  })

  describe('OcrResult - 类型定义', () => {
    it('应该返回正确的结果结构', async () => {
      // Arrange
      const imagePath = path.join(testImageDir, 'structure.png')
      const expectedText = '结构化文本'
      mockRecognize.mockResolvedValue({
        data: {
          text: expectedText,
          confidence: 95,
          lines: [
            { text: '结构化文本', bbox: { x0: 0, y0: 0, x1: 100, y1: 20 }, confidence: 95 }
          ],
          words: [
            { text: '结构化', choices: ['结构化', '结果化'], confidence: 95 },
            { text: '文本', choices: ['文本', '文件'], confidence: 90 }
          ]
        }
      })

      // Act
      const { extractTextFromImage } = await import(OCR_MODULE_PATH)
      const result = await extractTextFromImage(imagePath, { includeDetails: true })

      // Assert
      expect(result).toMatchObject({
        text: expectedText,
        confidence: 95,
        success: true,
        method: 'tesseract'
      })
      expect(result.lines).toBeDefined()
      expect(result.words).toBeDefined()
    })
  })

  describe('性能测试', () => {
    it('应该在合理时间内完成单张图片识别', async () => {
      // Arrange
      const imagePath = path.join(testImageDir, 'performance.png')
      mockRecognize.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return { data: { text: 'Performance test', confidence: 90 } }
      })

      // Act
      const { extractTextFromImage } = await import(OCR_MODULE_PATH)
      const startTime = Date.now()
      await extractTextFromImage(imagePath, { timeout: 10000 })
      const duration = Date.now() - startTime

      // Assert
      expect(duration).toBeLessThan(10000)
    })

    it('应该支持超时设置', async () => {
      // Arrange
      const imagePath = path.join(testImageDir, 'slow.png')
      mockRecognize.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 5000))
        return { data: { text: 'Slow', confidence: 80 } }
      })

      // Act & Assert
      const { extractTextFromImage } = await import(OCR_MODULE_PATH)
      await expect(
        extractTextFromImage(imagePath, { timeout: 1000 })
      ).rejects.toThrow('OCR 识别超时')
    })
  })

  describe('预处理选项', () => {
    it('应该支持图片预处理（二值化）', async () => {
      // Arrange
      const imagePath = path.join(testImageDir, 'noisy.png')
      mockRecognize.mockResolvedValue({
        data: { text: '清晰文本', confidence: 95 }
      })

      // Act
      const { extractTextFromImage } = await import(OCR_MODULE_PATH)
      await extractTextFromImage(imagePath, { preprocess: 'binarize' })

      // Assert
      expect(mockRecognize).toHaveBeenCalled()
    })

    it('应该支持降噪预处理', async () => {
      // Arrange
      const imagePath = path.join(testImageDir, 'noisy2.png')
      mockRecognize.mockResolvedValue({
        data: { text: '降噪后文本', confidence: 92 }
      })

      // Act
      const { extractTextFromImage } = await import(OCR_MODULE_PATH)
      await extractTextFromImage(imagePath, { preprocess: 'denoise' })

      // Assert
      expect(mockRecognize).toHaveBeenCalled()
    })
  })
})

describe('OCR: PDF 转 图片处理', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 默认 mock 行为
    mockMkdir.mockResolvedValue(undefined)
    mockWriteFile.mockResolvedValue(undefined)
    mockUnlink.mockResolvedValue(undefined)
    mockAccess.mockResolvedValue(undefined)
  })

  describe('convertPdfToImages', () => {
    it('应该将 PDF 转换为图片数组', async () => {
      // Arrange
      const pdfPath = path.join(process.cwd(), 'tests', 'fixtures', 'pdfs', 'document.pdf')
      mockAccess.mockResolvedValue(undefined)

      // Act
      const { convertPdfToImages } = await import('./tesseract')
      const images = await convertPdfToImages(pdfPath)

      // Assert
      expect(images).toBeInstanceOf(Array)
      expect(images.length).toBeGreaterThan(0)
      expect(images[0]).toHaveProperty('page')
      expect(images[0]).toHaveProperty('imagePath')
    })

    it('应该支持指定 DPI', async () => {
      // Arrange
      const pdfPath = path.join(process.cwd(), 'tests', 'fixtures', 'pdfs', 'document.pdf')
      mockAccess.mockResolvedValue(undefined)

      // Act
      const { convertPdfToImages } = await import('./tesseract')
      await convertPdfToImages(pdfPath, { dpi: 300 })

      // Assert - 验证调用成功
      expect(true).toBe(true)
    })

    it('应该处理文件不存在错误', async () => {
      // Arrange
      const pdfPath = '/path/does/not/exist.pdf'
      mockAccess.mockRejectedValue(new Error('ENOENT'))

      // Act & Assert
      const { convertPdfToImages } = await import('./tesseract')
      await expect(convertPdfToImages(pdfPath)).rejects.toThrow('PDF 文件不存在')
    })

    it('应该验证文件扩展名', async () => {
      // Arrange
      const txtPath = '/path/to/document.txt'
      mockAccess.mockResolvedValue(undefined)

      // Act & Assert
      const { convertPdfToImages } = await import('./tesseract')
      await expect(convertPdfToImages(txtPath)).rejects.toThrow('不是 PDF 格式')
    })
  })

  describe('extractTextFromPdf', () => {
    it('应该从 PDF 中提取文本（先转图再 OCR）', async () => {
      // Arrange
      const pdfPath = path.join(process.cwd(), 'tests', 'fixtures', 'pdfs', 'invoice.pdf')
      const expectedText = '发票内容'
      mockAccess.mockResolvedValue(undefined)
      mockRecognize.mockResolvedValue({
        data: { text: expectedText, confidence: 95 }
      })

      // Act
      const { extractTextFromPdf } = await import('./tesseract')
      const result = await extractTextFromPdf(pdfPath)

      // Assert
      expect(result.text).toContain(expectedText)
      expect(result.pages).toBeGreaterThan(0)
      expect(result.method).toBe('tesseract')
    })

    it('应该返回平均置信度', async () => {
      // Arrange
      const pdfPath = path.join(process.cwd(), 'tests', 'fixtures', 'pdfs', 'multi.pdf')
      mockAccess.mockResolvedValue(undefined)
      mockRecognize.mockResolvedValue({
        data: { text: 'Text', confidence: 85 }
      })

      // Act
      const { extractTextFromPdf } = await import('./tesseract')
      const result = await extractTextFromPdf(pdfPath)

      // Assert
      expect(result.confidence).toBe(85)
    })
  })
})
