/**
 * @file tesseract.ts
 * @desc Tesseract OCR 文本提取模块
 * @input 依赖: tesseract.js, fs, path
 * @output 导出: extractTextFromImage, extractTextFromImages, convertPdfToImages, extractTextFromPdf
 * @see PRD: docs/PRD.md#F016
 */

import Tesseract from 'tesseract.js'
import fs from 'fs/promises'
import path from 'path'

/**
 * OCR 识别选项
 */
export interface OcrOptions {
  /** 识别语言列表，默认 ['chi_sim', 'eng'] */
  languages?: string[]
  /** 是否启用降级策略 */
  fallback?: boolean
  /** 是否包含详细信息（lines, words） */
  includeDetails?: boolean
  /** 超时时间（毫秒） */
  timeout?: number
  /** 预处理选项 */
  preprocess?: 'binarize' | 'denoise' | 'none'
}

/**
 * OCR 识别结果
 */
export interface OcrResult {
  /** 识别的文本 */
  text: string
  /** 置信度 0-100 */
  confidence: number
  /** 是否成功 */
  success: boolean
  /** 识别方法 */
  method: 'tesseract' | 'fallback'
  /** 是否为空结果 */
  isEmpty?: boolean
  /** 错误信息（如果失败） */
  error?: string
  /** 详细信息（可选） */
  lines?: Array<{
    text: string
    bbox: { x0: number; y0: number; x1: number; y1: number }
    confidence: number
  }>
  words?: Array<{
    text: string
    choices: string[]
    confidence: number
  }>
}

/**
 * 批量处理选项
 */
export interface BatchOptions extends OcrOptions {
  /** 是否并发处理 */
  concurrent?: boolean
  /** 并发数量（默认4） */
  concurrency?: number
  /** 遇到错误是否继续 */
  continueOnError?: boolean
}

/**
 * 批量处理结果
 */
export interface BatchResult extends OcrResult {
  /** 文件索引 */
  index?: number
  /** 源文件路径 */
  source?: string
}

/**
 * PDF 转图片选项
 */
export interface PdfToImageOptions {
  /** DPI，默认 200 */
  dpi?: number
  /** 输出格式，默认 png */
  format?: 'png' | 'jpg'
  /** 输出目录 */
  outputDir?: string
}

/**
 * PDF 转图片结果
 */
export interface PdfImageResult {
  /** 页码（从1开始） */
  page: number
  /** 图片路径 */
  imagePath: string
  /** 图片 Buffer */
  buffer?: Buffer
}

/**
 * PDF OCR 结果
 */
export interface PdfOcrResult extends OcrResult {
  /** 总页数 */
  pages: number
  /** 每页结果 */
  pageResults?: OcrResult[]
}

/**
 * 从图片中提取文本
 * @param input 图片路径、Buffer 或 URL
 * @param options 识别选项
 * @returns OCR 识别结果
 */
export async function extractTextFromImage(
  input: string | Buffer,
  options: OcrOptions = {}
): Promise<OcrResult> {
  const {
    languages = ['chi_sim', 'eng'],
    fallback = false,
    includeDetails = false,
    timeout = 30000
  } = options

  // 创建超时 Promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`OCR timeout after ${timeout}ms`)), timeout)
  })

  try {
    // 执行 OCR 识别
    const ocrPromise = performOcr(input, languages, includeDetails)

    const result = await Promise.race([ocrPromise, timeoutPromise])

    // 检查是否为空结果
    const isEmpty = !result.text || result.text.trim().length === 0

    return {
      ...result,
      success: true,
      method: 'tesseract',
      isEmpty
    }
  } catch (error: any) {
    if (fallback) {
      return {
        text: '',
        confidence: 0,
        success: false,
        method: 'fallback',
        error: error.message
      }
    }

    // 根据错误类型提供更友好的错误信息
    if (error.message?.includes('timeout')) {
      throw new Error(`OCR 识别超时，请尝试减少图片大小或增加超时时间`)
    }

    if (error.message?.includes('not found') || error.code === 'ENOENT') {
      throw new Error(`文件不存在: ${input}`)
    }

    throw new Error(`OCR 识别失败: ${error.message}`)
  }
}

/**
 * 执行实际的 OCR 识别
 */
async function performOcr(
  input: string | Buffer,
  languages: string[],
  includeDetails: boolean
): Promise<Pick<OcrResult, 'text' | 'confidence' | 'lines' | 'words'>> {
  // 处理不同输入类型
  let imagePath = input as string

  if (Buffer.isBuffer(input)) {
    // Buffer 输入 - 保存临时文件
    const tempDir = path.join(process.cwd(), '.temp', 'ocr')
    await fs.mkdir(tempDir, { recursive: true })
    imagePath = path.join(tempDir, `temp-${Date.now()}.png`)
    await fs.writeFile(imagePath, input)
  }

  // 执行识别
  const result = await (Tesseract as any).recognize(
    imagePath,
    languages.join('+'),
    {
      logger: () => {} // 禁用日志
    }
  )

  // 清理临时文件
  if (Buffer.isBuffer(input) && imagePath) {
    fs.unlink(imagePath).catch(() => {})
  }

  // 提取基本信息
  const response: Pick<OcrResult, 'text' | 'confidence' | 'lines' | 'words'> = {
    text: result.data?.text || '',
    confidence: result.data?.confidence || 0
  }

  // 提取详细信息
  if (includeDetails && result.data?.lines) {
    response.lines = result.data.lines.map((line: any) => ({
      text: line.text,
      bbox: line.bbox,
      confidence: line.confidence
    }))
  }

  if (includeDetails && result.data?.words) {
    response.words = result.data.words.map((word: any) => ({
      text: word.text,
      choices: word.choices || [],
      confidence: word.confidence
    }))
  }

  return response
}

/**
 * 从多张图片中批量提取文本
 * @param inputs 图片路径数组
 * @param options 批量处理选项
 * @returns OCR 识别结果数组
 */
export async function extractTextFromImages(
  inputs: Array<string | Buffer>,
  options: BatchOptions = {}
): Promise<BatchResult[]> {
  const {
    concurrent = false,
    concurrency = 4,
    continueOnError = true
  } = options

  if (concurrent) {
    return await extractConcurrently(inputs, options, concurrency, continueOnError)
  }

  return await extractSequentially(inputs, options, continueOnError)
}

/**
 * 顺序提取多张图片
 */
async function extractSequentially(
  inputs: Array<string | Buffer>,
  options: OcrOptions,
  continueOnError: boolean
): Promise<BatchResult[]> {
  const results: BatchResult[] = []

  for (let i = 0; i < inputs.length; i++) {
    try {
      const result = await extractTextFromImage(inputs[i], options)
      results.push({
        ...result,
        index: i,
        source: String(inputs[i]),
        success: true
      })
    } catch (error: any) {
      if (continueOnError) {
        results.push({
          text: '',
          confidence: 0,
          success: false,
          method: 'fallback',
          error: error.message,
          index: i,
          source: String(inputs[i])
        })
      } else {
        throw error
      }
    }
  }

  return results
}

/**
 * 并发提取多张图片
 */
async function extractConcurrently(
  inputs: Array<string | Buffer>,
  options: OcrOptions,
  concurrency: number,
  continueOnError: boolean
): Promise<BatchResult[]> {
  const results: BatchResult[] = []

  // 分批处理
  for (let i = 0; i < inputs.length; i += concurrency) {
    const batch = inputs.slice(i, i + concurrency)
    const batchPromises = batch.map(async (input, batchIndex) => {
      try {
        const result = await extractTextFromImage(input, options)
        return {
          ...result,
          index: i + batchIndex,
          source: String(input),
          success: true
        }
      } catch (error: any) {
        if (continueOnError) {
          return {
            text: '',
            confidence: 0,
            success: false,
            method: 'fallback',
            error: error.message,
            index: i + batchIndex,
            source: String(input)
          }
        }
        throw error
      }
    })

    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)
  }

  return results
}

/**
 * 将 PDF 转换为图片数组
 * @param pdfPath PDF 文件路径
 * @param options 转换选项
 * @returns 图片结果数组
 */
export async function convertPdfToImages(
  pdfPath: string,
  options: PdfToImageOptions = {}
): Promise<PdfImageResult[]> {
  const { dpi = 200, format = 'png', outputDir } = options

  // 检查文件是否存在
  try {
    await fs.access(pdfPath)
  } catch {
    throw new Error(`PDF 文件不存在: ${pdfPath}`)
  }

  // 检查文件扩展名
  const ext = path.extname(pdfPath).toLowerCase()
  if (ext !== '.pdf') {
    throw new Error(`文件不是 PDF 格式: ${pdfPath}`)
  }

  // 创建输出目录
  const outputDirectory = outputDir || path.join(process.cwd(), '.temp', 'pdf-images')
  await fs.mkdir(outputDirectory, { recursive: true })

  // 模拟返回结果（实际需要 pdf2pic 或 pdfjs-dist）
  return [
    {
      page: 1,
      imagePath: path.join(outputDirectory, `page-1.${format}`)
    }
  ]
}

/**
 * 从 PDF 中提取文本
 * @param pdfPath PDF 文件路径
 * @param options OCR 选项
 * @returns PDF OCR 结果
 */
export async function extractTextFromPdf(
  pdfPath: string,
  options: OcrOptions = {}
): Promise<PdfOcrResult> {
  // 将 PDF 转换为图片
  const images = await convertPdfToImages(pdfPath, { dpi: 200 })

  // 对每页图片进行 OCR
  const pageResults: OcrResult[] = []
  const allTexts: string[] = []

  for (const image of images) {
    const result = await extractTextFromImage(image.imagePath, options)
    pageResults.push(result)
    if (result.text) {
      allTexts.push(result.text)
    }
  }

  // 合并所有文本
  const combinedText = allTexts.join('\n\n')

  // 计算平均置信度
  const avgConfidence = pageResults.reduce((sum, r) => sum + r.confidence, 0) / pageResults.length

  return {
    text: combinedText,
    confidence: avgConfidence,
    success: true,
    method: 'tesseract',
    pages: images.length,
    pageResults
  }
}

/**
 * 预处理图片（提高 OCR 准确率）
 * @param imagePath 图片路径
 * @param preprocessType 预处理类型
 * @returns 处理后的图片路径
 */
export async function preprocessImage(
  imagePath: string,
  preprocessType: 'binarize' | 'denoise' = 'binarize'
): Promise<string> {
  // TODO: 实现图片预处理
  // 可以使用 sharp 或 canvas 库
  return imagePath
}

/**
 * 检测图片中的文本区域
 * @param imagePath 图片路径
 * @returns 文本区域数组
 */
export async function detectTextRegions(
  imagePath: string
): Promise<Array<{ x: number; y: number; width: number; height: number }>> {
  // TODO: 实现文本区域检测
  return []
}
