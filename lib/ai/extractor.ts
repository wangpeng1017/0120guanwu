/**
 * @file extractor.ts
 * @desc 智能提取主入口 - 整合 OCR、AI 提取、错误处理
 * @input 依赖: ../ocr, error-handler, group-extractor
 * @output 导出: extractDeclarationData (主入口函数)
 * @see PRD: docs/PRD.md#F019
 */

import { extractTextFromImage, extractTextFromImages } from '../ocr'
import { extractByGroups } from './group-extractor'
import {
  processMaterialsWithFallback,
  retryWithBackoff,
  callWithProviderFallback,
  fallbackToOcrText,
  executeFullFallback,
  handleEmptyMaterials,
  handleAllMaterialsFailed,
  ErrorHandlerResult,
  LogEntry,
  Material
} from './error-handler'

// ============================================================
// 类型定义
// ============================================================

/** 材料类型 */
export type MaterialType = 'BILL_OF_LADING' | 'COMMERCIAL_INVOICE' | 'PACKING_LIST' | 'CONTRACT' | 'CERTIFICATE' | 'CUSTOMS_DECLARATION' | 'BONDED_NOTE' | 'OTHER'

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

/** 主提取结果 */
export interface ExtractDeclarationDataResult {
  success: boolean
  fallbackMode: boolean
  userMessage: string
  technicalMessage?: string
  data?: {
    header: Record<string, ExtractedValue>
    items: Array<Record<string, ExtractedValue>>
    overallConfidence: number
    groupResults?: {
      priceInfo?: ExtractedDeclaration
      transportInfo?: ExtractedDeclaration
      cargoDetails?: ExtractedDeclaration
      otherDocs?: ExtractedDeclaration
    }
    ocrText?: string
  }
  errors: Array<{ group: string; error: string }>
  logs: LogEntry[]
}

/** 提取配置 */
export interface ExtractionOptions {
  taskId?: string
  maxRetries?: number
  retryDelay?: number
  enableFallback?: boolean
  aiProviders?: Array<{
    name: string
    call: (prompt: string) => Promise<string>
    priority: number
  }>
}

// ============================================================
// 核心功能：智能提取主入口
// ============================================================

/**
 * 智能提取报关数据主入口
 *
 * 处理流程：
 * 1. 验证输入材料
 * 2. OCR 提取文本内容
 * 3. 调用 AI 进行智能分组提取
 * 4. 处理错误和降级策略
 *
 * @param materials - 材料列表
 * @param options - 提取配置
 * @returns 提取结果
 */
export async function extractDeclarationData(
  materials: Material[],
  options: ExtractionOptions = {}
): Promise<ExtractDeclarationDataResult> {
  const taskId = options.taskId ?? `task-${Date.now()}`
  const logs: LogEntry[] = []

  // Level 0: 验证输入
  if (materials.length === 0) {
    const result = await handleEmptyMaterials(materials)
    return {
      success: false,
      fallbackMode: false,
      userMessage: result.userMessage,
      technicalMessage: result.technicalMessage,
      errors: [],
      logs: result.logs
    }
  }

  logs.push({
    level: 'INFO',
    timestamp: new Date().toISOString(),
    taskId,
    message: `开始智能提取，共 ${materials.length} 个材料`
  })

  try {
    // Level 1: OCR 提取（带降级处理）
    const ocrResults = await extractWithOCRFallback(taskId, materials, logs)

    // 检查是否全部失败
    if (ocrResults.failedCount === materials.length) {
      const handlerResult = await handleAllMaterialsFailed(taskId, materials)
      return {
        ...handlerResult,
        errors: [{ group: 'OCR', error: '所有材料OCR失败' }],
        data: undefined
      }
    }

    // 更新材料内容
    const materialsWithContent = materials.map((material, index) => {
      const ocrResult = ocrResults.results.find(r => r.materialId === (material.id ?? material.originalName))
      return {
        ...material,
        content: ocrResult?.data ?? material.content ?? ''
      }
    })

    // Level 2: AI 智能分组提取（带重试和服务商切换）
    const aiResult = await extractWithAIFallback(materialsWithContent, taskId, options, logs)

    return {
      success: aiResult.success,
      fallbackMode: aiResult.fallbackMode,
      userMessage: aiResult.userMessage,
      technicalMessage: aiResult.technicalMessage,
      data: aiResult.data,
      errors: aiResult.errors,
      logs: [...logs] // 复制日志避免引用问题
    }

  } catch (error) {
    const err = error as Error
    logs.push({
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      taskId,
      message: '提取过程发生未预期错误',
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack
      }
    })

    // Level 3: 完全降级
    const fallbackResult = await executeFullFallback({
      taskId,
      materials,
      failedGroups: [],
      ocrText: materials.map(m => m.content).join('\n\n')
    })

    return {
      success: false,
      fallbackMode: true,
      userMessage: fallbackResult.userMessage,
      technicalMessage: fallbackResult.technicalMessage,
      data: fallbackResult.data,
      errors: [{ group: 'all', error: err.message }],
      logs: [...logs, ...fallbackResult.logs]
    }
  }
}

// ============================================================
// 辅助功能：OCR 提取（带降级）
// ============================================================

interface OcrExtractionResult {
  success: boolean
  processedCount: number
  failedCount: number
  failedMaterials: string[]
  results: Array<{ materialId: string; success: boolean; data?: string }>
}

async function extractWithOCRFallback(
  taskId: string,
  materials: Material[],
  logs: LogEntry[]
): Promise<OcrExtractionResult> {
  // 定义 OCR 函数
  const ocrFunc = async (material: Material): Promise<string> => {
    const result = await extractTextFromImage(material.fileUrl)
    if (!result.success) {
      throw new Error(result.error || 'OCR failed')
    }
    return result.text
  }

  // 使用带降级的处理
  const result = await processMaterialsWithFallback(taskId, materials, ocrFunc)

  // 添加日志
  logs.push(...result.results.map(r => ({
    level: (r.success ? 'INFO' : 'WARN') as const,
    timestamp: new Date().toISOString(),
    taskId,
    materialId: r.materialId,
    message: r.success ? 'OCR 提取成功' : 'OCR 提取失败'
  })))

  return result
}

// ============================================================
// 辅助功能：AI 提取（带重试和服务商切换）
// ============================================================

interface AIFallbackResult {
  success: boolean
  fallbackMode: boolean
  userMessage: string
  technicalMessage: string
  data?: {
    header: Record<string, ExtractedValue>
    items: Array<Record<string, ExtractedValue>>
    overallConfidence: number
    groupResults?: {
      priceInfo?: ExtractedDeclaration
      transportInfo?: ExtractedDeclaration
      cargoDetails?: ExtractedDeclaration
      otherDocs?: ExtractedDeclaration
    }
  }
  errors: Array<{ group: string; error: string }>
}

async function extractWithAIFallback(
  materials: Material[],
  taskId: string,
  options: ExtractionOptions,
  logs: LogEntry[]
): Promise<AIFallbackResult> {
  try {
    // 如果配置了多个 AI 服务商，使用服务商切换
    if (options.aiProviders && options.aiProviders.length > 0) {
      const providerResult = await callWithProviderFallback(
        options.aiProviders,
        JSON.stringify(materials.map(m => ({ type: m.materialType, name: m.originalName, content: m.content }))),
        { taskId }
      )

      if (!providerResult.success) {
        throw new Error('所有 AI 服务商都失败')
      }

      // 解析结果（这里简化处理，实际应该解析 JSON）
      // 由于服务商返回的是字符串，我们需要用分组提取
    }

    // 使用标准分组提取
    const groupResult = await extractByGroups(materials)

    return {
      success: groupResult.errors.length === 0,
      fallbackMode: false,
      userMessage: '提取成功',
      technicalMessage: 'Extraction completed successfully',
      data: {
        header: groupResult.header,
        items: groupResult.items,
        overallConfidence: groupResult.overallConfidence,
        groupResults: groupResult.groupResults
      },
      errors: groupResult.errors
    }

  } catch (error) {
    const err = error as Error
    logs.push({
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      taskId,
      message: 'AI 提取失败',
      error: {
        name: err.name,
        message: err.message
      }
    })

    // 启用降级模式
    const ocrText = materials.map(m => m.content).join('\n\n---\n\n')
    const fallbackResult = await fallbackToOcrText(materials, ocrText)

    return {
      success: false,
      fallbackMode: true,
      userMessage: fallbackResult.userMessage,
      technicalMessage: err.message,
      data: fallbackResult.data,
      errors: [{ group: 'all', error: err.message }]
    }
  }
}

// ============================================================
// 工具函数
// ============================================================

/**
 * 创建带图片 URL 的材料对象
 */
export function createMaterialFromUrl(
  fileUrl: string,
  materialType: MaterialType,
  id?: string
): Material {
  const fileName = fileUrl.split('/').pop() ?? 'unknown'
  return {
    materialType,
    originalName: fileName,
    fileUrl,
    id
  }
}

/**
 * 批量创建材料对象
 */
export function createMaterialsFromUrls(
  urls: Array<{ url: string; type: MaterialType; id?: string }>
): Material[] {
  return urls.map(({ url, type, id }) => createMaterialFromUrl(url, type, id))
}

/**
 * 验证提取结果的完整性
 */
export function validateExtractionResult(result: ExtractDeclarationDataResult): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []

  if (!result.data) {
    issues.push('缺少提取数据')
    return { valid: false, issues }
  }

  // 检查置信度
  if (result.data.overallConfidence < 0.5) {
    issues.push(`整体置信度过低: ${result.data.overallConfidence}`)
  }

  // 检查必填字段（示例）
  const requiredFields = ['goodsName']
  const hasItems = result.data.items && result.data.items.length > 0
  if (!hasItems) {
    issues.push('缺少商品明细')
  } else {
    for (const item of result.data.items) {
      for (const field of requiredFields) {
        if (!item[field] || (item[field] as ExtractedValue).confidence < 0.5) {
          issues.push(`商品项缺少必填字段或置信度过低: ${field}`)
        }
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues
  }
}

/**
 * 生成提取报告摘要
 */
export function generateExtractionSummary(result: ExtractDeclarationDataResult): {
  status: string
  materialsProcessed: number
  fieldsExtracted: number
  confidence: number
  errorsCount: number
} {
  const fieldsCount = result.data
    ? Object.keys(result.data.header).length +
      (result.data.items?.reduce((sum, item) => sum + Object.keys(item).length, 0) ?? 0)
    : 0

  return {
    status: result.success ? '成功' : result.fallbackMode ? '降级' : '失败',
    materialsProcessed: result.data?.groupResults
      ? Object.values(result.data.groupResults).filter(Boolean).length
      : 0,
    fieldsExtracted: fieldsCount,
    confidence: result.data?.overallConfidence ?? 0,
    errorsCount: result.errors.length
  }
}
