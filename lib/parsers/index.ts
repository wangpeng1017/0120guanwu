/**
 * 文件解析器统一入口
 * 根据文件类型选择合适的解析器
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { getOSSClient } from '@/lib/oss';

// PDF 文本提取（使用 pdf2json - 无 canvas 依赖）
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // 动态导入 pdf2json (ESM 模块)
    const pdf2jsonModule = await import('pdf2json');
    const { PDFParser } = pdf2jsonModule;

    // 创建解析器实例
    const pdfParser = new PDFParser();

    // 解析 PDF
    const data = await new Promise((resolve, reject) => {
      pdfParser.parseBuffer(buffer, (err: any, data: any) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    // 提取文本内容
    const parsedData = data as any;
    if (parsedData && parsedData.formPages && parsedData.formPages.length > 0) {
      const textItems: string[] = [];
      parsedData.formPages.forEach((page: any) => {
        if (page.texts) {
          page.texts.forEach((textItem: any) => {
            if (textItem.text) {
              textItems.push(textItem.text);
            }
          });
        }
      });
      return textItems.join(' ');
    }

    // 如果 pdf2json 失败，返回基本信息
    return `[PDF 文件 - ${buffer.length} bytes - 文本内容为空或无法解析]`;
  } catch (error: any) {
    console.error('PDF 解析错误:', error.message);
    throw error;
  }
}

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
  try {
    const text = await extractTextFromPDF(buffer);
    return {
      text,
      metadata: {
        pages: 1,
      },
    };
  } catch (error: any) {
    console.error('PDF 解析错误:', error.message);
    // 如果解析失败，返回提示信息
    return {
      text: `[PDF 文件 - ${buffer.length} bytes - 解析失败: ${error.message}]`,
      metadata: { pages: 0 },
    };
  }
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
 * 从本地文件路径读取并解析
 */
export async function parseFromLocalPath(
  filePath: string,
  mimeType: string,
  fileName: string
): Promise<ParseResult> {
  // 尝试多个可能的路径
  const possiblePaths = [
    filePath, // 原始路径
    `/root/guanwu-uploads${filePath}`, // 持久化目录（带 /uploads 前缀）
    `/root/guanwu-uploads${filePath.replace('/uploads/', '/')}`, // 持久化目录（去掉 /uploads 前缀）
    `/root/guanwu-system/.next/standalone/guanwu-system/public${filePath}`, // standalone 目录
    `/root/guanwu-system/public${filePath}`, // 源码目录
    `${process.cwd()}/public${filePath}`, // 当前工作目录
  ];

  let buffer: Buffer | null = null;
  let actualPath = '';

  for (const tryPath of possiblePaths) {
    try {
      if (fs.existsSync(tryPath)) {
        buffer = fs.readFileSync(tryPath);
        actualPath = tryPath;
        console.log(`[parseFromLocalPath] 找到文件: ${actualPath}`);
        break;
      }
    } catch {
      // 继续尝试下一个路径
    }
  }

  if (!buffer) {
    throw new Error(`文件未找到，尝试过的路径: ${possiblePaths.join(', ')}`);
  }

  return parseFile(buffer, mimeType, fileName);
}

/**
 * 从 URL 获取文件内容并解析
 */
export async function parseFromUrl(
  fileUrl: string,
  mimeType: string,
  fileName: string,
  storedName?: string
): Promise<ParseResult> {
  // 如果是本地路径（以 /uploads 开头），优先从本地文件系统读取
  if (fileUrl.startsWith('/uploads/') || fileUrl.startsWith('./uploads/')) {
    try {
      return await parseFromLocalPath(fileUrl, mimeType, fileName);
    } catch (localError: any) {
      console.log(`[parseFromUrl] 本地读取失败，尝试 OSS: ${localError.message}`);
      // 本地读取失败，尝试从 OSS 获取
    }
  }

  // 尝试从 OSS 获取文件（通过 storedName 或从 URL 提取）
  const ossClient = getOSSClient();
  if (ossClient) {
    try {
      // 从 storedName 或 fileUrl 提取 OSS key
      let ossKey = storedName || '';

      // 如果没有 storedName，尝试从 fileUrl 提取
      if (!ossKey && fileUrl.startsWith('http')) {
        const url = new URL(fileUrl);
        const pathParts = url.pathname.split('/');
        ossKey = pathParts.slice(1).join('/'); // 去掉开头的 /
      }

      // 如果是相对路径格式（如 uploads/OTHER/xxx.pdf）
      if (!ossKey && fileUrl.startsWith('/uploads/')) {
        ossKey = fileUrl.substring(1); // 去掉开头的 /
      }

      if (ossKey) {
        console.log(`[parseFromUrl] 尝试从 OSS 获取: ${ossKey}`);
        const result = await ossClient.get(ossKey);
        const buffer = result.content;
        console.log(`[parseFromUrl] OSS 文件获取成功，大小: ${buffer.length} bytes`);
        return parseFile(buffer, mimeType, fileName);
      }
    } catch (ossError: any) {
      console.log(`[parseFromUrl] OSS 获取失败: ${ossError.message}`);
    }
  }

  // HTTP/HTTPS URL
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`无法获取文件: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return parseFile(buffer, mimeType, fileName);
  }

  // 相对路径，尝试从本地读取
  return parseFromLocalPath(fileUrl, mimeType, fileName);
}
