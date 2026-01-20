/**
 * GLM-4.7 智能提取服务
 * 用于从报关材料中提取申报要素
 *
 * API 文档: https://docs.bigmodel.cn/cn/guide/models/text/glm-4.7
 */

interface GLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface GLMResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 调用 GLM-4.7 API
 */
async function callGLM47(messages: GLMMessage[]): Promise<string> {
  const apiKey = process.env.ZHIPUAI_API_KEY;

  if (!apiKey) {
    throw new Error('未配置 ZHIPUAI_API_KEY 环境变量');
  }

  const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'glm-4.7',
      messages,
      thinking: { type: 'enabled' }, // 启用思考模式，提升复杂任务准确度
      max_tokens: 65536,
      temperature: 0.3, // 较低温度保证提取的稳定性
      top_p: 0.9,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GLM-4.7 API 错误: ${response.status} - ${error}`);
  }

  const data: GLMResponse = await response.json();
  return data.choices[0].message.content;
}

/**
 * 提取报关申报要素
 *
 * @param materials - 材料文件列表
 * @returns 提取的申报数据
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

  // 构建提示词
  const prompt = buildExtractionPrompt(materials);

  // 调用 GLM-4.7 API
  const responseText = await callGLM47([
    {
      role: 'user',
      content: prompt,
    },
  ]);

  // 解析返回的 JSON
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
  // 文件类型中文映射
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
  // 尝试提取 JSON 内容
  let jsonStr = responseText.trim();

  // 移除可能的代码块标记
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3);
  }

  // 查找第一个 { 和最后一个 }
  const firstBrace = jsonStr.indexOf('{');
  const lastBrace = jsonStr.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('AI 返回内容中未找到有效的 JSON');
  }

  jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);

  try {
    const result = JSON.parse(jsonStr);
    return result;
  } catch (error) {
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
