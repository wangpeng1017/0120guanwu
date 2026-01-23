/**
 * 单据类型识别器
 * 混合识别方式：文件名规则优先 + AI 视觉备用
 */

import { MaterialType } from '@/types/enums';

/**
 * 文件名规则模式配置
 */
const FILENAME_PATTERNS: Record<MaterialType, RegExp[]> = {
  [MaterialType.BILL_OF_LADING]: [
    /提单/i,
    /Bill of Lading/i,
    /\.BL\./i,
    /B\/L/i,
    /BL\d+/i
  ],
  [MaterialType.COMMERCIAL_INVOICE]: [
    /发票/i,
    /Invoice/i,
    /Commercial Invoice/i,
    /INV\d*/i
  ],
  [MaterialType.PACKING_LIST]: [
    /箱单/i,
    /装箱单/i,
    /Packing List/i,
    /PL\d*/i,
    /Packlist/i
  ],
  [MaterialType.CONTRACT]: [
    /合同/i,
    /Contract/i,
    /Sales Contract/i,
    /Purchase Contract/i
  ],
  [MaterialType.CUSTOMS_DECLARATION]: [
    /报关单/i,
    /Customs Declaration/i,
    /Declaration/i
  ],
  [MaterialType.BONDED_NOTE]: [
    /核注清单/i,
    /Bonded Note/i,
    /核注/i
  ],
  [MaterialType.CERTIFICATE]: [
    /原产地证/i,
    /Certificate/i,
    /CO/i,
    /Origin/i
  ],
  [MaterialType.OTHER]: []
};

/**
 * 识别结果
 */
export interface MaterialRecognitionResult {
  type: MaterialType;
  method: 'filename-rule' | 'ai-vision' | 'manual';
  confidence: number;
}

/**
 * 识别单据类型（混合方式）
 * @param fileName 文件名
 * @param fileBuffer 文件内容（可选，用于 AI 识别）
 */
export async function recognizeMaterialType(
  fileName: string,
  fileBuffer?: Buffer
): Promise<MaterialRecognitionResult> {
  // 1. 文件名规则识别（优先，快速且免费）
  const ruleBasedResult = recognizeByFilenameRule(fileName);
  if (ruleBasedResult) {
    return {
      type: ruleBasedResult,
      method: 'filename-rule' as const,
      confidence: 1.0
    };
  }

  // 2. 如果提供了文件内容，尝试 AI 视觉识别（备用）
  if (fileBuffer) {
    try {
      return await recognizeByAI(fileBuffer);
    } catch (error) {
      console.error('[MaterialRecognizer] AI 识别失败:', error);
      // AI 识别失败，返回 OTHER 类型
    }
  }

  // 3. 无法识别，返回 OTHER 类型
  return {
    type: MaterialType.OTHER,
    method: 'manual' as const,
    confidence: 0
  };
}

/**
 * 通过文件名规则识别单据类型
 */
function recognizeByFilenameRule(fileName: string): MaterialType | null {
  // 遍历所有单据类型
  for (const [type, patterns] of Object.entries(FILENAME_PATTERNS)) {
    // 跳过 OTHER 类型
    if (type === MaterialType.OTHER) continue;

    // 测试所有模式
    for (const pattern of patterns) {
      if (pattern.test(fileName)) {
        console.log(`[MaterialRecognizer] 通过文件名规则识别: ${fileName} -> ${type}`);
        return type as MaterialType;
      }
    }
  }

  return null;
}

/**
 * 通过 AI 视觉识别单据类型
 * 注意：此功能需要集成 AI 视觉 API（如 Claude/GPT-4V）
 */
async function recognizeByAI(fileBuffer: Buffer): Promise<MaterialRecognitionResult> {
  // TODO: 集成 AI 视觉识别 API
  // 这里需要：
  // 1. 将 PDF 转换为图片
  // 2. 调用 AI 视觉 API
  // 3. 解析返回结果

  const prompt = `
    请识别这份单据的类型，从以下类型中选择一个：
    - 提单 (BILL_OF_LADING)
    - 商业发票 (COMMERCIAL_INVOICE)
    - 装箱单 (PACKING_LIST)
    - 合同 (CONTRACT)
    - 报关单 (CUSTOMS_DECLARATION)
    - 核注清单 (BONDED_NOTE)
    - 原产地证 (CERTIFICATE)

    只返回类型代码和置信度（0-1），格式：{"type": "BILL_OF_LADING", "confidence": 0.95}
  `;

  // 临时实现：返回 OTHER
  // 实际使用时需要调用 AI API
  console.warn('[MaterialRecognizer] AI 视觉识别尚未实现，返回 OTHER 类型');
  return {
    type: MaterialType.OTHER,
    method: 'ai-vision' as const,
    confidence: 0
  };
}

/**
 * 批量识别单据类型
 */
export async function batchRecognizeMaterialTypes(
  files: string[]
): Promise<Array<{ fileName: string } & MaterialRecognitionResult>> {
  const results = await Promise.all(
    files.map(file => recognizeMaterialType(file))
  );

  return files.map((file, index) => ({
    fileName: file,
    ...results[index]
  }));
}

/**
 * 验证识别结果是否符合业务类型要求
 * @param recognizedTypes 已识别的单据类型列表
 * @param businessType 业务类型代码
 * @param requiredMaterials 必备单据配置
 */
export function validateRequiredMaterials(
  recognizedTypes: MaterialType[],
  businessType: string,
  requiredMaterials: {
    required: Array<{ type: string; name: string; minCount: number }>;
    optional: Array<{ type: string; name: string }>;
  }
): {
  valid: boolean;
  missing: string[];
  counts: Record<string, number>;
} {
  const missing: string[] = [];
  const counts: Record<string, number> = {};

  // 统计每种类型的数量
  recognizedTypes.forEach(type => {
    counts[type] = (counts[type] || 0) + 1;
  });

  // 检查必备单据
  requiredMaterials.required.forEach(item => {
    const count = counts[item.type] || 0;
    if (count < item.minCount) {
      missing.push(`${item.name} (需要${item.minCount}份，当前${count}份)`);
    }
  });

  return {
    valid: missing.length === 0,
    missing,
    counts
  };
}
