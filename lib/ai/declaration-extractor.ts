/**
 * Gemini 智能提取服务
 * 用于从报关材料中提取申报要素
 * 支持多模型自动切换（配额不足时切换到下一个模型）
 */

import { ProxyAgent, fetch as undiciFetch } from 'undici';

/**
 * Gemini 模型列表（按优先级排序）
 * 使用 API 返回的可用模型名称
 * 当配额不足时自动切换到下一个模型
 */
const GEMINI_MODELS = [
  'gemini-2.5-flash',              // 最新 2.5 Flash
  'gemini-2.5-pro',                // 最新 2.5 Pro
  'gemini-3-flash-preview',        // 3.0 Flash 预览版
  'gemini-3-pro-preview',          // 3.0 Pro 预览版
  'gemini-2.5-flash-lite',         // 2.5 Flash Lite
  'gemini-2.5-flash-preview-09-2025',  // 2.5 Flash 预览
  'gemini-2.0-flash-001',          // 2.0 Flash 001
  'gemini-2.0-flash-lite-001',     // 2.0 Flash Lite 001
  'gemini-flash-latest',           // Flash 最新版
  'gemini-flash-lite-latest',      // Flash Lite 最新版
  'gemini-pro-latest',             // Pro 最新版
  'gemini-exp-1206',               // 实验版 1206
  'gemini-2.0-flash',              // 2.0 Flash 稳定版
  'gemini-2.0-flash-lite',         // 2.0 Flash Lite
  'gemini-2.0-flash-exp',          // 2.0 Flash 实验版
] as const;

/** 是否为配额错误 */
function isQuotaError(statusCode: number, errorText: string): boolean {
  if (statusCode === 429) return true;
  if (errorText.includes('RESOURCE_EXHAUSTED')) return true;
  if (errorText.includes('quota exceeded')) return true;
  if (errorText.includes('quotaLimitExceeded')) return true;
  if (errorText.includes('QUOTA_EXCEEDED')) return true;
  if (errorText.includes('limit: 0')) return true;
  return false;
}

/**
 * 调用 Gemini API（通过代理，支持多模型自动切换）
 */
async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('未配置 GEMINI_API_KEY 环境变量');
  }

  const proxyUrl = process.env.PROXY_URL || 'http://127.0.0.1:7890';
  const dispatcher = new ProxyAgent(proxyUrl);

  // 遍历所有模型，直到成功或全部失败
  const errors: Array<{ model: string; error: string }> = [];

  for (const model of GEMINI_MODELS) {
    try {
      console.log(`[Gemini] 尝试使用模型: ${model}`);

      const response = await undiciFetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3 },
          }),
          dispatcher,
        }
      );

      const responseText = await response.text();

      if (!response.ok) {
        // 检查是否是配额错误
        if (isQuotaError(response.status, responseText)) {
          console.log(`[Gemini] 模型 ${model} 配额不足，切换下一个...`);
          errors.push({ model, error: `配额不足 (${response.status})` });
          continue; // 尝试下一个模型
        }
        // 其他错误直接抛出
        throw new Error(`Gemini API 错误 (${model}): ${response.status} - ${responseText}`);
      }

      const data = await response.json() as any;
      console.log(`[Gemini] 模型 ${model} 调用成功`);
      return data.candidates[0].content.parts[0].text;

    } catch (error: any) {
      // 网络错误等，尝试下一个模型
      if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
        console.log(`[Gemini] 模型 ${model} 网络错误，切换下一个...`);
        errors.push({ model, error: '网络错误' });
        continue;
      }
      // 其他错误也尝试下一个
      errors.push({ model, error: error.message });
      console.log(`[Gemini] 模型 ${model} 失败: ${error.message}，切换下一个...`);
    }
  }

  // 所有模型都失败了
  throw new Error(
    `所有 Gemini 模型都失败:\n${errors.map(e => `  - ${e.model}: ${e.error}`).join('\n')}`
  );
}

/**
 * 提取报关申报要素
 */
export async function extractDeclaration(
  materials: Array<{
    fileType: string;
    originalName: string;
    fileUrl: string;
    content?: string;
  }>
): Promise<{
  header: Record<string, { value: string | number; confidence: number; source: string }>;
  items: Array<Record<string, { value: string | number; confidence: number; source: string }>>;
  overallConfidence: number;
}> {
  if (materials.length === 0) {
    throw new Error('没有可提取的材料');
  }

  const prompt = buildExtractionPrompt(materials);
  const responseText = await callGemini(prompt);
  return parseAIResponse(responseText);
}

/**
 * 构建提取提示词
 */
function buildExtractionPrompt(
  materials: Array<{
    fileType: string;
    originalName: string;
    fileUrl: string;
    content?: string;
  }>
): string {
  const fileTypeLabels: Record<string, string> = {
    BILL_OF_LADING: '提单',
    INVOICE: '发票',
    PACKING_LIST: '装箱单',
    CONTRACT: '合同',
    CERTIFICATE: '原产地证',
    OTHER: '其他文件',
  };

  return `你是专业的关务数据提取助手。请从以下报关材料中提取申报要素。

材料清单：
${materials.map((m, i) => {
  const typeLabel = fileTypeLabels[m.fileType] || m.fileType;
  return `--- 文件 ${i + 1}: ${m.originalName} (${typeLabel})
${m.content || '[文件内容需单独解析]'}`;
}).join('\n\n')}

请以 JSON 格式返回提取的数据，格式如下：
{
  "header": {
    "preEntryNo": { "value": "", "confidence": 0.9, "source": "文件1" },
    "customsNo": { "value": "", "confidence": 0.9, "source": "文件1" },
    "domesticConsignee": { "value": "", "confidence": 0.95, "source": "文件1" },
    "overseasConsignee": { "value": "", "confidence": 0.9, "source": "文件1" },
    "declarant": { "value": "", "confidence": 0.9, "source": "文件1" },
    "transportMode": { "value": "", "confidence": 0.9, "source": "文件1" },
    "vesselName": { "value": "", "confidence": 0.9, "source": "文件1" },
    "voyageNo": { "value": "", "confidence": 0.9, "source": "文件1" },
    "billNo": { "value": "", "confidence": 0.9, "source": "文件1" },
    "tradeCountry": { "value": "", "confidence": 0.9, "source": "文件1" },
    "portOfLoading": { "value": "", "confidence": 0.9, "source": "文件1" },
    "portOfDischarge": { "value": "", "confidence": 0.9, "source": "文件1" },
    "portOfEntry": { "value": "", "confidence": 0.9, "source": "文件1" },
    "destinationCountry": { "value": "", "confidence": 0.9, "source": "文件1" },
    "tradeMode": { "value": "", "confidence": 0.9, "source": "文件1" },
    "taxMode": { "value": "", "confidence": 0.9, "source": "文件1" },
    "natureOfTax": { "value": "", "confidence": 0.9, "source": "文件1" },
    "grossWeight": { "value": 0, "confidence": 0.9, "source": "文件1" },
    "netWeight": { "value": 0, "confidence": 0.9, "source": "文件1" },
    "packageCount": { "value": 0, "confidence": 0.9, "source": "文件1" },
    "packageType": { "value": "", "confidence": 0.9, "source": "文件1" },
    "containerNo": { "value": "", "confidence": 0.9, "source": "文件1" },
    "tradeCurrency": { "value": "", "confidence": 0.9, "source": "文件1" },
    "totalPrice": { "value": 0, "confidence": 0.9, "source": "文件1" },
    "invoiceNo": { "value": "", "confidence": 0.9, "source": "文件1" },
    "invoiceDate": { "value": "", "confidence": 0.9, "source": "文件1" },
    "contractNo": { "value": "", "confidence": 0.9, "source": "文件1" },
    "notes": { "value": "", "confidence": 0.9, "source": "文件1" }
  },
  "items": [
    {
      "itemNo": { "value": 1, "confidence": 1.0, "source": "文件2" },
      "goodsName": { "value": "", "confidence": 0.9, "source": "文件2" },
      "specs": { "value": "", "confidence": 0.9, "source": "文件2" },
      "hsCode": { "value": "", "confidence": 0.9, "source": "文件2" },
      "quantity": { "value": 0, "confidence": 0.9, "source": "文件2" },
      "unit": { "value": "", "confidence": 0.9, "source": "文件2" },
      "unitPrice": { "value": 0, "confidence": 0.9, "source": "文件2" },
      "totalPrice": { "value": 0, "confidence": 0.9, "source": "文件2" },
      "currency": { "value": "", "confidence": 0.9, "source": "文件2" },
      "countryOfOrigin": { "value": "", "confidence": 0.9, "source": "文件2" },
      "dutyRate": { "value": 0, "confidence": 0.9, "source": "文件2" },
      "vatRate": { "value": 0, "confidence": 0.9, "source": "文件2" },
      "notes": { "value": "", "confidence": 0.9, "source": "文件2" }
    }
  ],
  "overallConfidence": 0.92
}

注意事项：
1. 只返回 JSON，不要有其他解释文字
2. 如果某个字段在材料中找不到，value 为空字符串或 0，confidence 为 0，source 为空
3. confidence 范围 0-1，表示提取的可信度
4. source 标注数据来源的文件编号（如"文件1"）
5. 数值类型的字段（如重量、数量、价格）应返回数字类型
6. 日期格式统一为 YYYY-MM-DD`;
}

/**
 * 解析 AI 返回的 JSON
 */
function parseAIResponse(responseText: string): {
  header: Record<string, { value: string | number; confidence: number; source: string }>;
  items: Array<Record<string, { value: string | number; confidence: number; source: string }>>;
  overallConfidence: number;
} {
  let jsonStr = responseText.trim();

  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3);
  }

  const firstBrace = jsonStr.indexOf('{');
  const lastBrace = jsonStr.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('AI 返回内容中未找到有效的 JSON');
  }

  jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(jsonStr);
  } catch {
    console.error('解析 AI 返回的 JSON 失败:', jsonStr);
    throw new Error('解析 AI 返回数据失败');
  }
}

/**
 * 计算整体置信度
 */
export function calculateOverallConfidence(
  header: Record<string, { value: string | number; confidence: number; source: string }>,
  items: Array<Record<string, { value: string | number; confidence: number; source: string }>>
): number {
  const headerValues = Object.values(header);
  const itemValues = items.flatMap(Object.values);

  const allConfidences = [...headerValues, ...itemValues]
    .map(v => v.confidence)
    .filter(c => c > 0);

  if (allConfidences.length === 0) return 0;

  const sum = allConfidences.reduce((a, b) => a + b, 0);
  return sum / allConfidences.length;
}

/**
 * 获取当前可用模型列表
 */
export function getAvailableModels(): readonly string[] {
  return GEMINI_MODELS;
}
