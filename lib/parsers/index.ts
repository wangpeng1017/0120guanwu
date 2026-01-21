/**
 * 文件解析器统一入口
 * 根据文件类型选择合适的解析器
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { getOSSClient } from '@/lib/oss';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// PDF 文本提取（使用 pdftotext 作为主要方案，pdf2json 作为备用）
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // 方案1：尝试使用 pdftotext（服务器端工具，更可靠）
  try {
    console.log('[PDF解析] 尝试使用 pdftotext...');

    // 创建临时文件
    const tmpDir = '/tmp';
    const tmpFile = path.join(tmpDir, `pdf_${Date.now()}.pdf`);
    fs.writeFileSync(tmpFile, buffer);

    try {
      // 使用 pdftotext 提取文本
      const { stdout } = await execAsync(`pdftotext "${tmpFile}" -`, {
        timeout: 10000,
        maxBuffer: 10 * 1024 * 1024 // 10MB
      });

      // 清理临时文件
      fs.unlinkSync(tmpFile);

      if (stdout && stdout.trim().length > 0) {
        console.log(`[PDF解析] pdftotext 成功，文本长度: ${stdout.length}`);
        return stdout;
      }
    } catch (cmdError: any) {
      console.log(`[PDF解析] pdftotext 失败: ${cmdError.message}`);
      // 清理临时文件
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
    }
  } catch (error: any) {
    console.log(`[PDF解析] pdftotext 方案失败: ${error.message}`);
  }

  // 方案2：尝试使用 pdf2json（JavaScript 库）
  try {
    console.log('[PDF解析] 尝试使用 pdf2json...');

    // 动态导入 pdf2json (ESM 模块)
    const pdf2jsonModule = await import('pdf2json');
    const { PDFParser } = pdf2jsonModule;

    // 创建解析器实例
    const pdfParser = new PDFParser();

    // 解析 PDF（带超时）
    const data = await Promise.race([
      new Promise((resolve, reject) => {
        pdfParser.parseBuffer(buffer, (err: any, data: any) => {
          if (err) reject(err);
          else resolve(data);
        });
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('pdf2json 超时')), 5000)
      )
    ]);

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
      const result = textItems.join(' ');
      console.log(`[PDF解析] pdf2json 成功，文本长度: ${result.length}`);
      return result;
    }

    console.log(`[PDF解析] pdf2json formPages 为空`);
  } catch (error: any) {
    console.log(`[PDF解析] pdf2json 失败: ${error.message}`);
  }

  // 所有方案都失败，返回占位符
  console.log(`[PDF解析] 所有方案都失败，返回占位符`);
  return `[PDF 文件 - ${buffer.length} bytes - 文本内容为空或无法解析]`;
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

      // 将表格数据转换为文本
      text += `\n=== ${sheetName} ===\n`;
      jsonData.forEach((row: any[]) => {
        text += row.join('\t') + '\n';
      });
    }
  });

  return {
    text: text.trim(),
    tables,
    metadata: {
      pages: workbook.SheetNames.length,
    },
  };
}

/**
 * 从 URL 解析文件
 */
export async function parseFromUrl(
  fileUrl: string,
  mimeType: string,
  originalName: string,
  storedName?: string
): Promise<ParseResult> {
  console.log(`[parseFromUrl] 开始解析: ${originalName}, MIME: ${mimeType}`);

  // 尝试从本地路径读取
  if (storedName) {
    const localPaths = [
      `/root/guanwu-uploads/${storedName}`,
      storedName,
    ];

    for (const localPath of localPaths) {
      if (fs.existsSync(localPath)) {
        console.log(`[parseFromLocalPath] 找到文件: ${localPath}`);
        const buffer = fs.readFileSync(localPath);

        if (mimeType === 'application/pdf' || originalName.toLowerCase().endsWith('.pdf')) {
          return await parsePDF(buffer);
        } else if (
          mimeType.includes('spreadsheet') ||
          mimeType.includes('excel') ||
          originalName.match(/\.(xlsx?|csv)$/i)
        ) {
          return parseExcel(buffer);
        }
      }
    }
  }

  // 如果本地文件不存在，尝试从 OSS 下载
  if (fileUrl.startsWith('http')) {
    console.log(`[parseFromUrl] 从 OSS 下载: ${fileUrl}`);
    const ossClient = getOSSClient();
    if (!ossClient) {
      console.log(`[parseFromUrl] OSS 客户端未配置`);
      return {
        text: `[无法解析文件: ${originalName} - OSS未配置]`,
        metadata: { pages: 0 },
      };
    }
    const objectName = fileUrl.split('/').slice(3).join('/');
    const result = await ossClient.get(objectName);
    const buffer = result.content as Buffer;

    if (mimeType === 'application/pdf' || originalName.toLowerCase().endsWith('.pdf')) {
      return await parsePDF(buffer);
    } else if (
      mimeType.includes('spreadsheet') ||
      mimeType.includes('excel') ||
      originalName.match(/\.(xlsx?|csv)$/i)
    ) {
      return parseExcel(buffer);
    }
  }

  return {
    text: `[无法解析文件: ${originalName}]`,
    metadata: { pages: 0 },
  };
}
