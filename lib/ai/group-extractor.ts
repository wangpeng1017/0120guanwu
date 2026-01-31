/**
 * @file group-extractor.ts
 * @desc 智能分组提取器 - 按业务语义分组并发处理
 * @input 依赖: declaration-extractor (callGemini), types
 * @output 导出: groupMaterialsByType, extractGroup, extractAllGroups, mergeGroupResults, extractByGroups
 * @see PRD: docs/PRD.md#F017
 */

import { callGemini } from './declaration-extractor'

// ============================================================
// 类型定义
// ============================================================

/** 材料类型 */
export type MaterialType = 'BILL_OF_LADING' | 'COMMERCIAL_INVOICE' | 'PACKING_LIST' | 'CONTRACT' | 'CERTIFICATE' | 'CUSTOMS_DECLARATION' | 'BONDED_NOTE' | 'OTHER'

/** 材料接口 */
export interface Material {
  materialType: MaterialType
  originalName: string
  fileUrl: string
  content?: string
  id?: string
  taskId?: string
  fileSize?: number
  mimeType?: string
  createdAt?: Date
}

/** 提取值 */
export interface ExtractedValue {
  value: string | number
  confidence: number
  source: string
}

/** 提取结果 */
export interface ExtractedDeclaration {
  header: Record<string, ExtractedValue>
  items: Array<Record<string, ExtractedValue>>
  overallConfidence: number
}

/** 材料分组 */
export interface MaterialGroups {
  priceInfo: Material[]      // 价格信息组：商业发票
  transportInfo: Material[]  // 运输信息组：提单
  cargoDetails: Material[]   // 货物详情组：装箱单、合同
  otherDocs: Material[]      // 其他单证组：其他所有类型
}

/** 分组提取结果 */
export interface GroupExtractResult {
  header: Record<string, ExtractedValue>
  items: Array<Record<string, ExtractedValue>>
  overallConfidence: number
  groupResults: {
    priceInfo?: ExtractedDeclaration
    transportInfo?: ExtractedDeclaration
    cargoDetails?: ExtractedDeclaration
    otherDocs?: ExtractedDeclaration
  }
  errors: Array<{ group: string; error: string }>
}

/** 分组键类型 */
type GroupKey = 'priceInfo' | 'transportInfo' | 'cargoDetails' | 'otherDocs'

// ============================================================
// 常量定义
// ============================================================

/** 材料类型中文标签 */
const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  BILL_OF_LADING: '提单',
  COMMERCIAL_INVOICE: '商业发票',
  PACKING_LIST: '装箱单',
  CONTRACT: '合同',
  CERTIFICATE: '原产地证',
  CUSTOMS_DECLARATION: '报关单',
  BONDED_NOTE: '核注清单',
  OTHER: '其他文件',
}

/** 分组映射：材料类型 -> 分组键 */
const GROUP_MAPPING: Partial<Record<MaterialType, GroupKey>> = {
  COMMERCIAL_INVOICE: 'priceInfo',
  BILL_OF_LADING: 'transportInfo',
  PACKING_LIST: 'cargoDetails',
  CONTRACT: 'cargoDetails',
}

// ============================================================
// 核心功能：分组逻辑
// ============================================================

/**
 * 按材料类型分组
 * 将材料按业务语义分成4个组：
 * - 价格信息组：商业发票
 * - 运输信息组：提单
 * - 货物详情组：装箱单、合同
 * - 其他单证组：其他所有类型
 */
export function groupMaterialsByType(materials: Material[]): MaterialGroups {
  const groups: MaterialGroups = {
    priceInfo: [],
    transportInfo: [],
    cargoDetails: [],
    otherDocs: [],
  }

  for (const material of materials) {
    const groupKey = GROUP_MAPPING[material.materialType]
    if (groupKey) {
      groups[groupKey].push(material)
    } else {
      // 未明确分组的类型归入 otherDocs
      groups.otherDocs.push(material)
    }
  }

  return groups
}

// ============================================================
// 核心功能：单组提取
// ============================================================

/**
 * 为指定组构建专用的提取提示词
 */
function buildGroupPrompt(materials: Material[], groupKey: GroupKey): string {
  const groupConfigs: Record<GroupKey, { focus: string; fields: string[] }> = {
    priceInfo: {
      focus: '价格和发票信息',
      fields: ['invoiceNo', 'invoiceDate', 'totalPrice', 'tradeCurrency', 'tradeCountry', 'contractNo']
    },
    transportInfo: {
      focus: '运输和物流信息',
      fields: ['vesselName', 'voyageNo', 'billNo', 'portOfLoading', 'portOfDischarge', 'portOfEntry', 'transportMode']
    },
    cargoDetails: {
      focus: '货物详情和商品信息',
      fields: ['goodsName', 'specs', 'hsCode', 'quantity', 'unit', 'grossWeight', 'netWeight', 'packageCount', 'packageType']
    },
    otherDocs: {
      focus: '其他补充信息',
      fields: ['preEntryNo', 'customsNo', 'domesticConsignee', 'overseasConsignee', 'declarant', 'notes']
    }
  }

  const config = groupConfigs[groupKey]
  const materialsText = materials.map((m, i) => {
    const label = MATERIAL_TYPE_LABELS[m.materialType] || m.materialType
    return `--- 文件 ${i + 1}: ${m.originalName} (${label})
${m.content || '[文件内容需单独解析]'}`
  }).join('\n\n')

  return `你是专业的关务数据提取助手。请从以下材料中提取【${config.focus}】。

材料清单：
${materialsText}

请以 JSON 格式返回提取的数据，格式如下：
{
  "header": {
    ${config.fields.map(f => `"${f}": { "value": "", "confidence": 0.9, "source": "文件1" }`).join(',\n    ')}
  },
  "items": [
    {
      "itemNo": { "value": 1, "confidence": 1.0, "source": "文件1" },
      "goodsName": { "value": "", "confidence": 0.9, "source": "文件1" },
      "specs": { "value": "", "confidence": 0.9, "source": "文件1" },
      "hsCode": { "value": "", "confidence": 0.9, "source": "文件1" },
      "quantity": { "value": 0, "confidence": 0.9, "source": "文件1" },
      "unit": { "value": "", "confidence": 0.9, "source": "文件1" },
      "unitPrice": { "value": 0, "confidence": 0.9, "source": "文件1" },
      "totalPrice": { "value": 0, "confidence": 0.9, "source": "文件1" },
      "currency": { "value": "", "confidence": 0.9, "source": "文件1" },
      "countryOfOrigin": { "value": "", "confidence": 0.9, "source": "文件1" }
    }
  ],
  "overallConfidence": 0.9
}

**要求**：
1. 只返回纯 JSON，不要有解释文字或markdown标记
2. 找不到的字段设为空字符串""或0，confidence设为0
3. 数值字段必须是数字类型，不要加引号
4. 日期格式：YYYY-MM-DD
5. confidence范围0-1，表示提取可信度
6. source标注数据来源（如"文件1"、"文件2"）`
}

/**
 * 解析 AI 返回的 JSON
 */
function parseAIResponse(responseText: string): ExtractedDeclaration {
  let jsonStr = responseText.trim()

  // 移除 markdown 标记
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7)
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3)
  }
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3)
  }

  // 提取 JSON 部分
  const firstBrace = jsonStr.indexOf('{')
  const lastBrace = jsonStr.lastIndexOf('}')

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('AI 返回内容中未找到有效的 JSON')
  }

  jsonStr = jsonStr.substring(firstBrace, lastBrace + 1)

  try {
    return JSON.parse(jsonStr)
  } catch (error) {
    console.error('解析 AI 返回的 JSON 失败:', jsonStr)
    throw new Error('解析 AI 返回数据失败')
  }
}

/**
 * 提取单个组的数据
 */
export async function extractGroup(
  materials: Material[],
  groupKey: GroupKey
): Promise<ExtractedDeclaration> {
  // 空组返回空结果
  if (materials.length === 0) {
    return {
      header: {},
      items: [],
      overallConfidence: 0
    }
  }

  const prompt = buildGroupPrompt(materials, groupKey)
  const responseText = await callGemini(prompt)
  return parseAIResponse(responseText)
}

// ============================================================
// 核心功能：并发提取所有组
// ============================================================

/**
 * 并发提取所有非空组的数据
 * 使用 Promise.allSettled 确保单个组失败不影响其他组
 */
export async function extractAllGroups(
  materials: Material[]
): Promise<{
  priceInfo?: ExtractedDeclaration
  transportInfo?: ExtractedDeclaration
  cargoDetails?: ExtractedDeclaration
  otherDocs?: ExtractedDeclaration
  errors: Array<{ group: string; error: string }>
}> {
  const groups = groupMaterialsByType(materials)
  const errors: Array<{ group: string; error: string }> = []

  // 构建提取任务
  const tasks: Array<{ key: GroupKey; promise: Promise<ExtractedDeclaration> }> = []

  for (const key of ['priceInfo', 'transportInfo', 'cargoDetails', 'otherDocs'] as GroupKey[]) {
    const groupMaterials = groups[key]
    if (groupMaterials.length > 0) {
      tasks.push({
        key,
        promise: extractGroup(groupMaterials, key)
      })
    }
  }

  // 并发执行所有任务
  const results = await Promise.allSettled(tasks.map(t => t.promise))

  // 组装结果
  const output: {
    priceInfo?: ExtractedDeclaration
    transportInfo?: ExtractedDeclaration
    cargoDetails?: ExtractedDeclaration
    otherDocs?: ExtractedDeclaration
    errors: Array<{ group: string; error: string }>
  } = {
    errors
  }

  for (let i = 0; i < results.length; i++) {
    const task = tasks[i]
    const result = results[i]

    if (result.status === 'fulfilled') {
      output[task.key] = result.value
    } else {
      const error = result.reason as Error
      errors.push({
        group: task.key,
        error: error.message || String(error)
      })
    }
  }

  return output
}

// ============================================================
// 核心功能：结果合并
// ============================================================

/**
 * 计算整体置信度
 */
function calculateOverallConfidence(
  header: Record<string, ExtractedValue>,
  items: Array<Record<string, ExtractedValue>>
): number {
  const headerValues = Object.values(header)
  const itemValues = items.flatMap(Object.values)

  const allConfidences = [...headerValues, ...itemValues]
    .map(v => v.confidence)
    .filter(c => c > 0)

  if (allConfidences.length === 0) return 0

  const sum = allConfidences.reduce((a, b) => a + b, 0)
  return sum / allConfidences.length
}

/**
 * 合并多个组的提取结果
 * - 表头字段：取置信度最高的值
 * - 表体字段：累加所有商品项
 * - 冲突处理：按置信度取最优
 */
export function mergeGroupResults(
  groupResults: {
    priceInfo?: ExtractedDeclaration
    transportInfo?: ExtractedDeclaration
    cargoDetails?: ExtractedDeclaration
    otherDocs?: ExtractedDeclaration
  }
): ExtractedDeclaration {
  const mergedHeader: Record<string, ExtractedValue> = {}
  const mergedItems: Array<Record<string, ExtractedValue>> = []
  const allItems: Array<Record<string, ExtractedValue>> = []

  // 处理每个组的结果
  for (const groupKey of ['priceInfo', 'transportInfo', 'cargoDetails', 'otherDocs'] as const) {
    const result = groupResults[groupKey]
    if (!result) continue

    // 合并表头字段
    for (const [fieldName, fieldValue] of Object.entries(result.header)) {
      const existing = mergedHeader[fieldName]

      if (!existing) {
        // 新字段，直接添加
        mergedHeader[fieldName] = fieldValue
      } else if (fieldValue.confidence > existing.confidence) {
        // 存在冲突，取高置信度的值
        mergedHeader[fieldName] = fieldValue
      }
      // 如果置信度相同或更低，保留原值
    }

    // 收集表体项
    if (result.items && result.items.length > 0) {
      allItems.push(...result.items)
    }
  }

  // 合并表体项：按项号分组，合并相同项号的字段
  const itemMap = new Map<number | string, Record<string, ExtractedValue>>()

  for (const item of allItems) {
    const itemNoValue = item.itemNo?.value
    const itemNo = itemNoValue ?? `auto-${mergedItems.length}`

    if (!itemMap.has(itemNo)) {
      itemMap.set(itemNo, { ...item })
    } else {
      // 合并相同项号的字段，取高置信度
      const existing = itemMap.get(itemNo)!
      for (const [fieldName, fieldValue] of Object.entries(item)) {
        const existingValue = existing[fieldName]
        if (!existingValue || (fieldValue.confidence > existingValue.confidence)) {
          existing[fieldName] = fieldValue
        }
      }
    }
  }

  // 转换为数组并按项号排序
  mergedItems.push(...Array.from(itemMap.values()))
  mergedItems.sort((a, b) => {
    const aNo = a.itemNo?.value ?? 0
    const bNo = b.itemNo?.value ?? 0
    return (typeof aNo === 'number' ? aNo : 0) - (typeof bNo === 'number' ? bNo : 0)
  })

  // 计算整体置信度
  const overallConfidence = calculateOverallConfidence(mergedHeader, mergedItems)

  return {
    header: mergedHeader,
    items: mergedItems,
    overallConfidence
  }
}

// ============================================================
// 公开接口：完整流程
// ============================================================

/**
 * 智能分组提取主入口
 * 按业务语义分组 -> 并发 AI 提取 -> 结果合并
 */
export async function extractByGroups(materials: Material[]): Promise<GroupExtractResult> {
  // 空材料处理
  if (materials.length === 0) {
    return {
      header: {},
      items: [],
      overallConfidence: 0,
      groupResults: {},
      errors: []
    }
  }

  // 分组提取
  const groupResults = await extractAllGroups(materials)

  // 合并结果
  const merged = mergeGroupResults(groupResults)

  return {
    ...merged,
    groupResults,
    errors: groupResults.errors
  }
}
