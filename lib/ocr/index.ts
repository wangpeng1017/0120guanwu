/**
 * @file index.ts
 * @desc OCR 模块导出入口
 * @input 依赖: ./tesseract
 * @output 导出: 所有 OCR 相关功能
 * @see PRD: docs/PRD.md#F016
 */

export {
  extractTextFromImage,
  extractTextFromImages,
  extractTextFromPdf,
  convertPdfToImages,
  preprocessImage,
  detectTextRegions
} from './tesseract'

export type {
  OcrOptions,
  OcrResult,
  BatchOptions,
  BatchResult,
  PdfToImageOptions,
  PdfImageResult,
  PdfOcrResult
} from './tesseract'
