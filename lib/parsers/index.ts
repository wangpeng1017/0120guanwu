/**
 * 文件解析器统一入口
 * 根据文件类型选择合适的解析器
 */

import * as XLSX from 'xlsx';
import { PDFParse as pdfParse } from 'pdf-parse';

export interface ParseResult {
  text: string;
  tables?: Array<Array<string | number>>;
  metadata?: {
    pages?: number;
    author?: string;
    title?: string;
  };
}

/**
 * 解析 PDF 文件
 */
export async function parsePDF(buffer: Buffer): Promise<ParseResult> {
  const parser = new pdfParse({ data: buffer });
  const textResult = await parser.getText();
  const info = await parser.getInfo();
  await parser.destroy();

  return {
    text: textResult.text,
    metadata: {
      pages: info.total || 0,
    },
  };
}

/**
 * 解析 Excel 文件
 */
export function parseExcel(buffer: Buffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const tables: Array<Array<string | number>> = [];
  let text = '';

  // 遍历所有工作表
  workbook.SheetNames.forEach((sheetName, index) => {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as Array<any>;

    if (jsonData.length > 0) {
      tables.push(...jsonData);
      text += `\n--- 工作表 ${index + 1}: ${sheetName} ---\n`;
      jsonData.forEach(row => {
        text += (row as Array<string | number>).join('\t') + '\n';
      });
    }
  });

  return {
    text,
    tables,
  };
}

/**
 * 解析 CSV 文件
 */
export function parseCSV(buffer: Buffer): ParseResult {
  return parseExcel(buffer); // 使用 Excel 解析器处理 CSV
}

/**
 * 解析图片文件（OCR）
 * 注意：需要额外配置 Tesseract 或使用云 OCR 服务
 */
export async function parseImage(buffer: Buffer): Promise<ParseResult> {
  // 本地开发：返回提示信息
  // 生产环境可以集成阿里云 OCR 或其他 OCR 服务
  const text = `[图片文件 - ${buffer.length} bytes]\n注意：图片 OCR 功能需要配置 OCR 服务（如阿里云 OCR）`;

  return {
    text,
  };
}

/**
 * 解析 Word 文档（需要额外依赖）
 */
export async function parseWord(buffer: Buffer): Promise<ParseResult> {
  // 使用 mammoth 或其他库解析 .docx
  const text = `[Word 文档 - ${buffer.length} bytes]\n注意：Word 解析功能需要安装 mammoth 库`;

  return {
    text,
  };
}

/**
 * 根据文件类型解析文件
 */
export async function parseFile(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<ParseResult> {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  // PDF 文件
  if (ext === 'pdf' || mimeType.includes('pdf')) {
    return parsePDF(buffer);
  }

  // Excel 文件
  if (
    ['xls', 'xlsx', 'csv'].includes(ext) ||
    mimeType.includes('sheet') ||
    mimeType.includes('excel')
  ) {
    return parseExcel(buffer);
  }

  // 图片文件
  if (
    ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'].includes(ext) ||
    mimeType.startsWith('image/')
  ) {
    return parseImage(buffer);
  }

  // Word 文档
  if (
    ['doc', 'docx'].includes(ext) ||
    mimeType.includes('word') ||
    mimeType.includes('document')
  ) {
    return parseWord(buffer);
  }

  // 未知类型，返回基本信息
  return {
    text: `[文件: ${fileName}, 类型: ${mimeType}, 大小: ${buffer.length} bytes]`,
  };
}

/**
 * 从 URL 获取文件内容并解析
 */
export async function parseFromUrl(
  fileUrl: string,
  mimeType: string,
  fileName: string
): Promise<ParseResult> {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`无法获取文件: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return parseFile(buffer, mimeType, fileName);
}
