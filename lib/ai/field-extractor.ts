/**
 * 字段提取器
 * 根据单据类型和字段映射配置，从单据中提取关键字段
 */

import { MaterialType } from '@/types/enums';
import fs from 'fs';
import path from 'path';

/**
 * 字段映射规则
 */
export interface FieldRule {
  fieldName: string;
  jsonPath: string;
  extractionPrompt: string;
  priority: 'required' | 'optional';
  dataType: 'string' | 'number' | 'date' | 'object' | 'array';
  validation?: string;
}

/**
 * 字段映射配置
 */
export interface FieldMappingConfig {
  materialType: MaterialType;
  description: string;
  extractFields: FieldRule[];
  bodyFields?: FieldRule[];
}

/**
 * 提取的字段
 */
export interface ExtractedField {
  fieldName: string;
  value: string | number | object | null;
  confidence: number;
  source: string;
}

/**
 * 提取结果
 */
export interface ExtractionResult {
  header: Record<string, ExtractedField>;
  body: Array<Record<string, ExtractedField>>;
  sourceMaterials: Array<{
    materialType: MaterialType;
    fileName: string;
    extractedFields: string[];
  }>;
  overallConfidence: number;
}

/**
 * 加载字段映射配置
 */
function loadFieldMapping(materialType: MaterialType): FieldMappingConfig | null {
  try {
    const configPath = path.join(
      process.cwd(),
      'docs',
      'field-mappings',
      'field-rules',
      `${materialType.toLowerCase().replace(/_/g, '-')}.json`
    );

    const configContent = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(configContent) as FieldMappingConfig;
  } catch (error) {
    console.error(`[FieldExtractor] 加载配置失败: ${materialType}`, error);
    return null;
  }
}

/**
 * 从单据中提取字段（使用现有的 Gemini AI）
 */
export async function extractFields(
  materialType: MaterialType,
  fileName: string,
  fileContent?: string,
  businessType?: string
): Promise<{
  header: Record<string, ExtractedField>;
  body: Array<Record<string, ExtractedField>>;
}> {
  // 1. 加载字段映射配置
  const fieldMapping = loadFieldMapping(materialType);
  if (!fieldMapping) {
    throw new Error(`未找到 ${materialType} 的字段映射配置`);
  }

  // 2. 构建提取 Prompt
  const prompt = buildExtractionPrompt(
    fieldMapping,
    fileName,
    fileContent,
    businessType
  );

  // 3. 调用 AI 提取（使用现有的 Gemini 服务）
  // 注意：这里需要复制 callGemini 的逻辑或导出它
  // 临时方案：使用 extractDeclaration 的内部逻辑
  try {
    // 读取配置文件以获取完整的 prompt
    const { ProxyAgent, fetch: undiciFetch } = await import('undici');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('未配置 GEMINI_API_KEY 环境变量');
    }

    const proxyUrl = process.env.PROXY_URL || 'http://127.0.0.1:7890';
    const dispatcher = new ProxyAgent(proxyUrl);

    const models = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3-flash-preview'];
    let lastError: any;

    for (const model of models) {
      try {
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

        if (response.ok) {
          const data = await response.json() as any;
          const responseText = data.candidates[0].content.parts[0].text;

          // 4. 解析 AI 返回结果
          const result = parseExtractionResponse(responseText, fieldMapping);
          return result;
        }
      } catch (error: any) {
        lastError = error;
        continue;
      }
    }

    throw lastError || new Error('所有 Gemini 模型都失败');
  } catch (error) {
    console.error('[FieldExtractor] AI 调用失败:', error);
    throw error;
  }
}

/**
 * 构建提取 Prompt
 */
function buildExtractionPrompt(
  fieldMapping: FieldMappingConfig,
  fileName: string,
  fileContent?: string,
  businessType?: string
): string {
  const materialTypeLabels: Record<MaterialType, string> = {
    [MaterialType.BILL_OF_LADING]: '提单',
    [MaterialType.COMMERCIAL_INVOICE]: '商业发票',
    [MaterialType.PACKING_LIST]: '装箱单',
    [MaterialType.CONTRACT]: '合同',
    [MaterialType.CUSTOMS_DECLARATION]: '报关单',
    [MaterialType.BONDED_NOTE]: '核注清单',
    [MaterialType.CERTIFICATE]: '原产地证',
    [MaterialType.OTHER]: '其他'
  };

  const typeLabel = materialTypeLabels[fieldMapping.materialType] || fieldMapping.materialType;

  let prompt = `你是专业的关务数据提取助手。\n\n`;
  prompt += `单据类型：${typeLabel}\n`;
  prompt += `文件名称：${fileName}\n`;
  if (businessType) {
    prompt += `业务类型：${businessType}\n`;
  }
  prompt += `\n`;

  // 表头字段
  prompt += `请从以上${typeLabel}中提取以下表头字段：\n`;
  fieldMapping.extractFields.forEach(field => {
    const required = field.priority === 'required' ? '【必填】' : '【可选】';
    prompt += `- ${field.fieldName}：${field.extractionPrompt} (${required})\n`;
  });

  // 表体字段（如果有）
  if (fieldMapping.bodyFields && fieldMapping.bodyFields.length > 0) {
    prompt += `\n请提取以下商品明细字段：\n`;
    fieldMapping.bodyFields.forEach(field => {
      const required = field.priority === 'required' ? '【必填】' : '【可选】';
      prompt += `- ${field.fieldName}：${field.extractionPrompt} (${required})\n`;
    });
  }

  prompt += `\n请以 JSON 格式返回：\n`;
  prompt += `{\n`;
  prompt += `  "header": {\n`;
  prompt += `    "提单号": { "value": "", "confidence": 0.95, "source": "${fileName}" },\n`;
  prompt += `    ...\n`;
  prompt += `  },\n`;
  prompt += `  "body": [\n`;
  prompt += `    {\n`;
  prompt += `      "项号": { "value": 1, "confidence": 1.0, "source": "${fileName}" },\n`;
  prompt += `      ...\n`;
  prompt += `    }\n`;
  prompt += `  ]\n`;
  prompt += `}\n\n`;

  prompt += `注意事项：\n`;
  prompt += `1. 只返回 JSON，不要有其他解释文字\n`;
  prompt += `2. confidence 范围 0-1，表示提取的可信度\n`;
  prompt += `3. source 标注数据来源的文件名\n`;
  prompt += `4. 数值类型的字段应返回数字类型\n`;
  prompt += `5. 日期格式统一为 YYYY-MM-DD\n`;

  return prompt;
}

/**
 * 解析 AI 返回的提取结果
 */
function parseExtractionResponse(
  responseText: string,
  fieldMapping: FieldMappingConfig
): {
  header: Record<string, ExtractedField>;
  body: Array<Record<string, ExtractedField>>;
} {
  let jsonStr = responseText.trim();

  // 移除 Markdown 代码块标记
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3);
  }

  // 提取 JSON 部分
  const firstBrace = jsonStr.indexOf('{');
  const lastBrace = jsonStr.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('AI 返回内容中未找到有效的 JSON');
  }

  jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);

  try {
    const data = JSON.parse(jsonStr);

    // 处理表头数据
    const header: Record<string, ExtractedField> = {};
    if (data.header) {
      Object.keys(data.header).forEach(key => {
        header[key] = {
          fieldName: key,
          value: data.header[key].value ?? null,
          confidence: data.header[key].confidence ?? 0.5,
          source: data.header[key].source ?? ''
        };
      });
    }

    // 处理表体数据
    const body: Array<Record<string, ExtractedField>> = [];
    if (data.body && Array.isArray(data.body)) {
      data.body.forEach((item: any) => {
        const row: Record<string, ExtractedField> = {};
        Object.keys(item).forEach(key => {
          row[key] = {
            fieldName: key,
            value: item[key].value ?? null,
            confidence: item[key].confidence ?? 0.5,
            source: item[key].source ?? ''
          };
        });
        body.push(row);
      });
    }

    return { header, body };
  } catch (error) {
    console.error('[FieldExtractor] 解析 AI 返回数据失败:', jsonStr);
    throw new Error('解析 AI 返回数据失败');
  }
}

/**
 * 从多份单据中提取并合并字段
 */
export async function extractFromMultipleMaterials(
  materials: Array<{
    materialType: MaterialType;
    fileName: string;
    fileContent?: string;
  }>,
  businessType?: string
): Promise<ExtractionResult> {
  const sourceMaterials: ExtractionResult['sourceMaterials'] = [];
  const mergedHeader: Record<string, ExtractedField> = {};
  const mergedBody: Array<Record<string, ExtractedField>> = [];

  // 从每份单据中提取字段
  for (const material of materials) {
    const { header, body } = await extractFields(
      material.materialType,
      material.fileName,
      material.fileContent,
      businessType
    );

    // 记录来源
    sourceMaterials.push({
      materialType: material.materialType,
      fileName: material.fileName,
      extractedFields: Object.keys(header)
    });

    // 合并表头字段（优先使用置信度高的）
    Object.entries(header).forEach(([key, field]) => {
      if (!mergedHeader[key] || field.confidence > mergedHeader[key].confidence) {
        mergedHeader[key] = field;
      }
    });

    // 合并表体数据（直接追加）
    body.forEach(item => {
      mergedBody.push(item);
    });
  }

  // 计算整体置信度
  const allFields = [
    ...Object.values(mergedHeader),
    ...mergedBody.flatMap(Object.values)
  ];
  const overallConfidence = allFields.reduce((sum, f) => sum + f.confidence, 0) / allFields.length;

  return {
    header: mergedHeader,
    body: mergedBody,
    sourceMaterials,
    overallConfidence
  };
}

/**
 * 验证提取结果的完整性
 */
export function validateExtractionResult(
  result: ExtractionResult,
  requiredFields: string[]
): {
  valid: boolean;
  missing: string[];
  lowConfidence: string[];
} {
  const missing: string[] = [];
  const lowConfidence: string[] = [];

  requiredFields.forEach(field => {
    const extractedField = result.header[field];
    if (!extractedField) {
      missing.push(field);
    } else if (extractedField.confidence < 0.8) {
      lowConfidence.push(`${field} (${Math.round(extractedField.confidence * 100)}%)`);
    }
  });

  return {
    valid: missing.length === 0 && lowConfidence.length === 0,
    missing,
    lowConfidence
  };
}
