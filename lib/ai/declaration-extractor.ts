/**
 * Gemini 智能提取服务
 * 用于从报关材料中提取申报要素
 * 支持多模型自动切换（配额不足时切换到下一个模型）
 */

import { ProxyAgent, fetch as undiciFetch } from 'undici';

/**
 * Gemini 模型列表（按速度和性能排序）
 * 优先使用最快的模型以提升响应速度
 * 当配额不足时自动切换到下一个模型
 */
const GEMINI_MODELS = [
  'gemini-2.5-flash',              // ⚡ 最快 - 2.5 Flash（推荐）
  'gemini-2.5-flash-lite',         // ⚡ 轻量级 Flash
  'gemini-flash-latest',           // ⚡ Flash 最新版
  'gemini-flash-lite-latest',      // ⚡ Flash Lite 最新版
  'gemini-2.0-flash-001',          // 2.0 Flash 001
  'gemini-2.0-flash',              // 2.0 Flash 稳定版
  'gemini-2.0-flash-lite-001',     // 2.0 Flash Lite 001
  'gemini-2.0-flash-lite',         // 2.0 Flash Lite
  'gemini-2.5-flash-preview-09-2025',  // 2.5 Flash 预览
  'gemini-2.0-flash-exp',          // 2.0 Flash 实验版
  'gemini-3-flash-preview',        // 3.0 Flash 预览版
  'gemini-2.5-pro',                // Pro 版本（速度较慢但更精确）
  'gemini-3-pro-preview',          // 3.0 Pro 预览版
  'gemini-pro-latest',             // Pro 最新版
  'gemini-exp-1206',               // 实验版 1206
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

  // 代理配置（可选，仅在需要时启用）
  const proxyUrl = process.env.PROXY_URL;
  const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

  console.log(`[Gemini] 代理配置: ${proxyUrl ? proxyUrl : '未使用代理（直连）'}`);

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
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 32768, // 增加到 32K 以支持更大的申报数据
            },
          }),
          ...(dispatcher && { dispatcher }), // 仅在有代理时添加
        }
      );

      if (!response.ok) {
        const responseText = await response.text();
        // 检查是否是配额错误
        if (isQuotaError(response.status, responseText)) {
          console.log(`[Gemini] 模型 ${model} 配额不足，切换下一个...`);
          errors.push({ model, error: `配额不足 (${response.status})` });
          continue; // 尝试下一个模型
        }
        // 其他 HTTP 错误也尝试下一个模型（不抛出异常）
        errors.push({ model, error: `API错误 (${response.status})` });
        console.log(`[Gemini] 模型 ${model} 返回错误 ${response.status}，切换下一个...`);
        continue;
      }

      const data = await response.json() as any;
      console.log(`[Gemini] 模型 ${model} 调用成功`);
      return data.candidates[0].content.parts[0].text;

    } catch (error: any) {
      // 详细错误日志
      console.log(`[Gemini] 模型 ${model} 捕获异常:`, error.message, error.cause || '');

      // 网络错误等，尝试下一个模型
      if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED') || error.cause?.code === 'ECONNREFUSED') {
        console.log(`[Gemini] 模型 ${model} 网络错误，切换下一个...`);
        errors.push({ model, error: '网络错误' });
        continue;
      }
      // Body already read 错误也跳过
      if (error.message.includes('Body has already been read') || error.message.includes('Body is unusable')) {
        console.log(`[Gemini] 模型 ${model} Body 已被读取，切换下一个...`);
        errors.push({ model, error: 'Body 已被读取' });
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
    materialType: string;
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
    materialType: string;
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
  const typeLabel = fileTypeLabels[m.materialType] || m.materialType;
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

**要求**：
1. 只返回纯 JSON，不要有解释文字或markdown标记
2. 找不到的字段设为空字符串""或0，confidence设为0
3. 数值字段（重量、数量、价格）必须是数字类型，不要加引号
4. 日期格式：YYYY-MM-DD
5. confidence范围0-1，表示提取可信度
6. source标注数据来源（如"文件1"、"文件2"）
7. 快速提取关键信息，无需过度验证`;
}

/**
 * 解析 AI 返回的 JSON
 */
export function parseAIResponse(responseText: string): {
  header: Record<string, { value: string | number; confidence: number; source: string }>;
  items: Array<Record<string, { value: string | number; confidence: number; source: string }>>;
  overallConfidence: number;
} {
  console.log('[Gemini] 原始响应内容 (长度:', responseText.length, ')');
  console.log('[Gemini] 原始响应前500字符:', responseText.substring(0, 500));

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
    console.error('[Gemini] AI 返回内容中未找到有效的 JSON 花括号');
    console.error('[Gemini] 完整响应:', responseText);
    throw new Error('AI 返回内容中未找到有效的 JSON');
  }

  jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
  console.log('[Gemini] 提取的 JSON 字符串 (长度:', jsonStr.length, ')');
  console.log('[Gemini] 提取的 JSON 前300字符:', jsonStr.substring(0, 300));

  try {
    const parsed = JSON.parse(jsonStr);
    console.log('[Gemini] JSON 解析成功');
    return parsed;
  } catch (error: any) {
    console.error('[Gemini] 解析 AI 返回的 JSON 失败');
    console.error('[Gemini] JSON parse 错误:', error.message);
    console.error('[Gemini] 尝试解析的 JSON 字符串:', jsonStr);
    console.error('[Gemini] 原始响应:', responseText);
    throw new Error('解析 AI 返回数据失败: ' + error.message);
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

/**
 * 代理配置接口
 */
export interface ProxyConfig {
  enabled: boolean;
  url?: string;
  type?: 'http' | 'https' | 'socks4' | 'socks5';
  host?: string;
  port?: number;
  hasAuth?: boolean;
  error?: string;
}

/**
 * 代理连接测试结果接口
 */
export interface ProxyTestResult {
  success: boolean;
  reachable?: boolean;
  proxyUrl?: string;
  error?: string;
  skipped?: boolean;
  reason?: string;
  latency?: number;
}

/**
 * 获取代理配置
 * 从环境变量读取 PROXY_URL 并解析
 */
export function getProxyConfig(): ProxyConfig {
  const proxyUrl = process.env.PROXY_URL;

  if (!proxyUrl || proxyUrl.trim() === '') {
    return { enabled: false };
  }

  try {
    const url = new URL(proxyUrl);
    const config: ProxyConfig = {
      enabled: true,
      url: proxyUrl,
      type: detectProxyType(proxyUrl),
      host: url.hostname,
      port: url.port ? parseInt(url.port, 10) : undefined,
      hasAuth: !!url.username,
    };

    return config;
  } catch (error) {
    return {
      enabled: false,
      error: `无效的代理 URL: ${proxyUrl}`,
    };
  }
}

/**
 * 检测代理类型
 */
export function detectProxyType(proxyUrl: string): 'http' | 'https' | 'socks4' | 'socks5' | undefined {
  try {
    const url = new URL(proxyUrl);
    const protocol = url.protocol.replace(':', '');

    if (protocol === 'http') return 'http';
    if (protocol === 'https') return 'https';
    if (protocol === 'socks5') return 'socks5';
    if (protocol === 'socks4') return 'socks4';

    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * 格式化代理 URL 用于日志输出（隐藏密码）
 */
export function formatProxyUrlForLog(proxyUrl: string): string {
  try {
    const url = new URL(proxyUrl);
    if (url.password) {
      // 隐藏密码但保留用户名
      return `${url.protocol}//${url.username}:***@${url.host}${url.pathname}`;
    }
    return proxyUrl;
  } catch {
    return proxyUrl;
  }
}

/**
 * 测试代理连接
 * 尝试通过代理访问 Gemini API 验证连通性
 */
export async function testProxyConnection(
  options: { timeout?: number; testUrl?: string } = {}
): Promise<ProxyTestResult> {
  const config = getProxyConfig();

  if (!config.enabled) {
    return {
      success: false,
      skipped: true,
      reason: '未配置代理',
    };
  }

  const timeout = options.timeout ?? 10000;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const proxyUrl = process.env.PROXY_URL!;
    const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

    const testUrl = options.testUrl ?? 'https://www.googleapis.com/$discovery/rest/version';
    const startTime = Date.now();

    const response = await undiciFetch(testUrl, {
      method: 'HEAD',
      dispatcher,
      signal: controller.signal as any,
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;

    if (response.ok || response.status === 404) {
      return {
        success: true,
        reachable: true,
        proxyUrl: formatProxyUrlForLog(proxyUrl),
        latency,
      };
    }

    return {
      success: false,
      reachable: false,
      proxyUrl: formatProxyUrlForLog(proxyUrl),
      error: `HTTP ${response.status}`,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return {
        success: false,
        reachable: false,
        error: '连接超时',
      };
    }

    const errorMsg = error.message || String(error);
    const proxyUrl = process.env.PROXY_URL!;

    return {
      success: false,
      reachable: false,
      proxyUrl: formatProxyUrlForLog(proxyUrl),
      error: errorMsg,
    };
  }
}

/**
 * 导出 callGemini 用于测试
 */
export { callGemini };
