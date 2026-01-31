/**
 * @file error-handler.ts
 * @desc 分层错误处理器 - 支持重试、服务商切换、降级策略
 * @input 依赖: types
 * @output 导出: 错误处理函数、日志函数、用户提示函数
 * @see PRD: docs/PRD.md#F018
 */

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

/** 错误级别 */
export type ErrorLevel = 'INFO' | 'WARN' | 'ERROR'

/** 结构化日志条目 */
export interface LogEntry {
  level: ErrorLevel
  timestamp: string
  taskId: string
  materialType?: string
  materialId?: string
  group?: string
  message: string
  error?: {
    name: string
    message: string
    stack?: string
  }
  context?: Record<string, unknown>
}

/** 错误处理结果 */
export interface ErrorHandlerResult {
  success: boolean
  fallbackMode: boolean
  userMessage: string
  technicalMessage: string
  data?: {
    header: Record<string, ExtractedValue>
    items: Array<Record<string, ExtractedValue>>
    overallConfidence: number
    ocrText?: string
  }
  logs: LogEntry[]
}

/** AI 服务商配置 */
export interface AIProvider {
  name: string
  call: (prompt: string) => Promise<string>
  priority: number
}

/** 重试配置 */
export interface RetryOptions {
  maxRetries: number
  baseDelay: number
  maxDelay?: number
  shouldRetry?: (error: Error) => boolean
  taskId?: string
  group?: string
  onRetry?: (attempt: number, delay: number) => void
}

/** 重试结果 */
export interface RetryResult<T> {
  data: T
  logs: LogEntry[]
  attempts: number
}

/** 服务商切换结果 */
export interface ProviderFallbackResult {
  success: boolean
  usedProvider?: string
  data?: string
  logs: LogEntry[]
  error?: string
}

/** 材料处理结果 */
export interface MaterialProcessResult {
  success: boolean
  processedCount: number
  failedCount: number
  failedMaterials: string[]
  results: Array<{ materialId: string; success: boolean; data?: string }>
}

/** 分类后的日志 */
export interface CategorizedLogs {
  info: LogEntry[]
  warn: LogEntry[]
  error: LogEntry[]
}

// ============================================================
// 常量定义
// ============================================================

/** 默认重试配置 */
const DEFAULT_RETRY_OPTIONS: Required<Pick<RetryOptions, 'maxRetries' | 'baseDelay' | 'maxDelay'>> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000
}

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

/** 分组中文标签 */
const GROUP_LABELS: Record<string, string> = {
  priceInfo: '价格信息',
  transportInfo: '运输信息',
  cargoDetails: '货物详情',
  otherDocs: '其他单证'
}

// ============================================================
// 日志功能
// ============================================================

/**
 * 创建结构化日志条目
 */
export function createLogEntry(entry: Partial<LogEntry>): LogEntry {
  return {
    level: entry.level ?? 'INFO',
    timestamp: new Date().toISOString(),
    taskId: entry.taskId ?? 'unknown',
    materialType: entry.materialType,
    materialId: entry.materialId,
    group: entry.group,
    message: entry.message ?? '',
    error: entry.error,
    context: entry.context
  }
}

/**
 * 按错误级别分类日志
 */
export function categorizeLogs(logs: LogEntry[]): CategorizedLogs {
  return {
    info: logs.filter(log => log.level === 'INFO'),
    warn: logs.filter(log => log.level === 'WARN'),
    error: logs.filter(log => log.level === 'ERROR')
  }
}

/**
 * 输出格式化的日志摘要
 */
export function formatLogSummary(logs: LogEntry[]): string {
  const categorized = categorizeLogs(logs)
  return `日志摘要: INFO: ${categorized.info.length}, WARN: ${categorized.warn.length}, ERROR: ${categorized.error.length}`
}

/**
 * 记录材料错误
 */
export function logMaterialError(taskId: string, material: Material, error: Error): LogEntry[] {
  const logs: LogEntry[] = []

  logs.push(createLogEntry({
    level: 'ERROR',
    taskId,
    materialId: material.id,
    materialType: material.materialType,
    message: `${MATERIAL_TYPE_LABELS[material.materialType]} OCR 失败: ${material.originalName}`,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    }
  }))

  return logs
}

// ============================================================
// Level 1: 单材料失败处理
// ============================================================

/**
 * 处理材料列表，支持部分失败继续处理
 */
export async function processMaterialsWithFallback(
  taskId: string,
  materials: Material[],
  ocrFunc: (material: Material) => Promise<string>
): Promise<MaterialProcessResult> {
  const results: Array<{ materialId: string; success: boolean; data?: string }> = []
  const failedMaterials: string[] = []
  let processedCount = 0
  let failedCount = 0
  const logs: LogEntry[] = []

  logs.push(createLogEntry({
    level: 'INFO',
    taskId,
    message: `开始处理 ${materials.length} 个材料`
  }))

  for (const material of materials) {
    try {
      const data = await ocrFunc(material)
      results.push({
        materialId: material.id ?? material.originalName,
        success: true,
        data
      })
      processedCount++

      logs.push(createLogEntry({
        level: 'INFO',
        taskId,
        materialId: material.id,
        materialType: material.materialType,
        message: `${MATERIAL_TYPE_LABELS[material.materialType]} 处理成功: ${material.originalName}`
      }))
    } catch (error) {
      const err = error as Error
      failedMaterials.push(material.id ?? material.originalName)
      failedCount++

      results.push({
        materialId: material.id ?? material.originalName,
        success: false
      })

      logs.push(...logMaterialError(taskId, material, err))
    }
  }

  logs.push(createLogEntry({
    level: failedCount > 0 ? 'WARN' : 'INFO',
    taskId,
    message: `材料处理完成: 成功 ${processedCount}, 失败 ${failedCount}`
  }))

  return {
    success: failedCount === 0,
    processedCount,
    failedCount,
    failedMaterials,
    results
  }
}

/**
 * 获取部分失败的用户消息
 */
export function getUserMessageForPartialFailure(result: { processedCount: number; failedCount: number; total: number }): string {
  return `部分材料提取失败：成功 ${result.processedCount} 份，失败 ${result.failedCount} 份。失败的材料请手动补充信息。`
}

// ============================================================
// Level 2: 重试机制（指数退避）
// ============================================================

/**
 * 计算指数退避延迟
 */
function calculateBackoffDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  const delay = baseDelay * Math.pow(2, attempt)
  return Math.min(delay, maxDelay)
}

/**
 * 带指数退避的重试机制
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  prompt: string,
  options: RetryOptions
): Promise<RetryResult<T>> {
  const maxRetries = options.maxRetries ?? DEFAULT_RETRY_OPTIONS.maxRetries
  const baseDelay = options.baseDelay ?? DEFAULT_RETRY_OPTIONS.baseDelay
  const maxDelay = options.maxDelay ?? DEFAULT_RETRY_OPTIONS.maxDelay
  const shouldRetry = options.shouldRetry ?? (() => true)
  const logs: LogEntry[] = []

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn()

      if (attempt > 0) {
        logs.push(createLogEntry({
          level: 'INFO',
          taskId: options.taskId ?? 'unknown',
          group: options.group,
          message: `重试成功 (第 ${attempt} 次重试后)`
        }))
      }

      return {
        data: result,
        logs,
        attempts: attempt + 1
      }
    } catch (error) {
      lastError = error as Error

      if (attempt < maxRetries && shouldRetry(lastError)) {
        const delay = calculateBackoffDelay(attempt, baseDelay, maxDelay)

        logs.push(createLogEntry({
          level: 'WARN',
          taskId: options.taskId ?? 'unknown',
          group: options.group,
          message: `请求失败，${delay}ms 后进行第 ${attempt + 1} 次重试`,
          error: {
            name: lastError.name,
            message: lastError.message
          }
        }))

        if (options.onRetry) {
          options.onRetry(attempt + 1, delay)
        }

        await new Promise(resolve => setTimeout(resolve, delay))
      } else {
        logs.push(createLogEntry({
          level: 'ERROR',
          taskId: options.taskId ?? 'unknown',
          group: options.group,
          message: '重试次数用尽，请求最终失败',
          error: {
            name: lastError.name,
            message: lastError.message
          }
        }))
        break
      }
    }
  }

  throw lastError ?? new Error('重试失败')
}

// ============================================================
// Level 2: AI 服务商切换
// ============================================================

/**
 * 在多个 AI 服务商之间切换，直到成功或全部失败
 */
export async function callWithProviderFallback(
  providers: AIProvider[],
  prompt: string,
  context?: { taskId?: string; group?: string }
): Promise<ProviderFallbackResult> {
  const logs: LogEntry[] = []
  const taskId = context?.taskId ?? 'unknown'
  const group = context?.group

  // 按优先级排序
  const sortedProviders = [...providers].sort((a, b) => a.priority - b.priority)

  for (const provider of sortedProviders) {
    try {
      logs.push(createLogEntry({
        level: 'INFO',
        taskId,
        group,
        message: `尝试使用 AI 服务商: ${provider.name}`
      }))

      const result = await provider.call(prompt)

      logs.push(createLogEntry({
        level: 'INFO',
        taskId,
        group,
        message: `AI 服务商 ${provider.name} 调用成功`
      }))

      return {
        success: true,
        usedProvider: provider.name,
        data: result,
        logs
      }
    } catch (error) {
      const err = error as Error
      logs.push(createLogEntry({
        level: 'WARN',
        taskId,
        group,
        message: `AI 服务商 ${provider.name} 调用失败`,
        error: {
          name: err.name,
          message: err.message
        }
      }))
    }
  }

  logs.push(createLogEntry({
    level: 'ERROR',
    taskId,
    group,
    message: '所有 AI 服务商都失败'
  }))

  return {
    success: false,
    logs
  }
}

// ============================================================
// Level 2: 标记组为待人工处理
// ============================================================

/** 人工处理状态 */
export interface ManualProcessingStatus {
  group: string
  status: 'MANUAL_PROCESSING_REQUIRED'
  reason: string
  suggestedFields: string[]
  timestamp: string
}

/**
 * 标记失败的组为待人工处理
 */
export function markGroupForManualProcessing(
  taskId: string,
  groupName: string,
  error: Error
): ManualProcessingStatus {
  return {
    group: groupName,
    status: 'MANUAL_PROCESSING_REQUIRED',
    reason: error.message,
    suggestedFields: getSuggestedFieldsForGroup(groupName),
    timestamp: new Date().toISOString()
  }
}

/**
 * 获取组需要填写的建议字段
 */
function getSuggestedFieldsForGroup(groupName: string): string[] {
  const fieldMap: Record<string, string[]> = {
    priceInfo: ['invoiceNo', 'invoiceDate', 'totalPrice', 'tradeCurrency'],
    transportInfo: ['vesselName', 'voyageNo', 'billNo', 'portOfLoading', 'portOfDischarge'],
    cargoDetails: ['goodsName', 'specs', 'hsCode', 'quantity', 'unit'],
    otherDocs: ['preEntryNo', 'customsNo', 'declarant']
  }

  return fieldMap[groupName] || []
}

/**
 * 获取人工处理的用户消息
 */
export function getManualProcessingMessage(groupName: string, groupLabels: Record<string, string>): string {
  const label = groupLabels[groupName] || groupName
  return `${label}信息提取失败，请手动填写相关字段。`
}

// ============================================================
// Level 3: 降级策略
// ============================================================

/**
 * 降级到 OCR 纯文本
 */
export async function fallbackToOcrText(
  materials: Material[],
  ocrText: string
): Promise<ErrorHandlerResult> {
  const logs: LogEntry[] = []

  logs.push(createLogEntry({
    level: 'WARN',
    taskId: 'fallback',
    message: '启用降级模式：返回 OCR 纯文本'
  }))

  return {
    success: false,
    fallbackMode: true,
    userMessage: 'AI 服务暂时不可用，已提取文本内容供您参考。',
    technicalMessage: 'All AI services unavailable, falling back to OCR text',
    data: {
      header: {},
      items: [],
      overallConfidence: 0,
      ocrText
    },
    logs
  }
}

/**
 * 获取历史相似任务结果作为模板
 */
export async function getHistoricalTemplate(
  currentTask: Record<string, unknown>,
  historicalTasks: Record<string, unknown>[]
): Promise<Record<string, unknown> & { similarity: number }> {
  // 简单相似度计算：匹配字段数量
  let bestMatch: { task: Record<string, unknown>; score: number } | null = null

  for (const historical of historicalTasks) {
    let matchCount = 0
    for (const [key, value] of Object.entries(currentTask)) {
      if (historical[key] === value) {
        matchCount++
      }
    }

    if (!bestMatch || matchCount > bestMatch.score) {
      bestMatch = { task: historical, score: matchCount }
    }
  }

  const similarity = bestMatch ? bestMatch.score / Object.keys(currentTask).length : 0

  return {
    ...(bestMatch?.task ?? {}),
    similarity
  }
}

/**
 * 获取手动填写表单提示
 */
export function getManualFormPrompt(failedGroups: string[]): {
  message: string
  requiredFields: Record<string, string[]>
  instructions: string[]
} {
  const requiredFields: Record<string, string[]> = {}

  for (const group of failedGroups) {
    requiredFields[group] = getSuggestedFieldsForGroup(group)
  }

  return {
    message: '请手动填写以下信息',
    requiredFields,
    instructions: [
      '1. 根据原始单证填写对应字段',
      '2. 标注 * 的字段为必填项',
      '3. 填写完成后点击保存'
    ]
  }
}

/**
 * 综合降级策略
 */
export async function executeFullFallback(context: {
  taskId: string
  materials: Material[]
  ocrText?: string
  historicalData?: Record<string, unknown>
  failedGroups: string[]
}): Promise<ErrorHandlerResult> {
  const logs: LogEntry[] = []

  logs.push(createLogEntry({
    level: 'ERROR',
    taskId: context.taskId,
    message: '所有 AI 服务失败，执行综合降级策略'
  }))

  const userMessages: string[] = []

  // 如果有 OCR 文本，添加到消息
  if (context.ocrText) {
    userMessages.push('已提取 OCR 文本供参考。')
  }

  // 如果有历史数据，提示使用模板
  if (context.historicalData) {
    userMessages.push('可参考历史相似任务的填写模板。')
  }

  // 提示手动填写
  const formPrompt = getManualFormPrompt(context.failedGroups)
  userMessages.push(formPrompt.message)

  return {
    success: false,
    fallbackMode: true,
    userMessage: `AI 服务暂时不可用，请稍后重试或手动填写。${userMessages.join(' ')}`,
    technicalMessage: 'Complete AI service failure, fallback strategies executed',
    data: {
      header: {},
      items: [],
      overallConfidence: 0,
      ocrText: context.ocrText
    },
    logs
  }
}

// ============================================================
// 用户提示生成
// ============================================================

/**
 * 根据错误级别获取用户消息
 */
export function getUserMessage(level: number): string {
  const messages: Record<number, string> = {
    1: '部分材料提取失败，请手动补充相关信息。',
    2: '部分分组提取失败，请手动填写对应字段。',
    3: 'AI 服务暂时不可用，请稍后重试或手动填写表单。'
  }

  return messages[level] ?? '处理过程中发生错误，请稍后重试。'
}

/**
 * 获取可操作的用户消息
 */
export function getActionableUserMessage(context: {
  failedGroups: string[]
  availableOcrText: boolean
  hasHistoricalData: boolean
}): string {
  const suggestions: string[] = []

  if (context.failedGroups.length > 0) {
    const groupNames = context.failedGroups.map(g => GROUP_LABELS[g] || g).join('、')
    suggestions.push(`${groupNames}提取失败，请手动填写。`)
  }

  if (context.availableOcrText) {
    suggestions.push('已提取 OCR 文本，您可以复制相关内容。')
  }

  if (context.hasHistoricalData) {
    suggestions.push('系统找到相似的历史任务，可作为填写参考。')
  }

  return `建议：${suggestions.join(' ')}`
}

/**
 * 多语言错误消息
 */
const LOCALIZED_MESSAGES: Record<string, Record<string, string>> = {
  AI_SERVICE_UNAVAILABLE: {
    zh: 'AI 服务暂时不可用',
    en: 'AI service temporarily unavailable'
  },
  PARTIAL_FAILURE: {
    zh: '部分材料提取失败',
    en: 'Some materials extraction failed'
  },
  MANUAL_INPUT_REQUIRED: {
    zh: '需要手动输入',
    en: 'Manual input required'
  }
}

/**
 * 获取本地化消息
 */
export function getLocalizedMessage(errorType: string, locale: 'zh' | 'en' = 'zh'): string {
  return LOCALIZED_MESSAGES[errorType]?.[locale] ?? errorType
}

// ============================================================
// 边界情况处理
// ============================================================

/**
 * 处理空材料列表
 */
export async function handleEmptyMaterials(materials: Material[]): Promise<ErrorHandlerResult> {
  return {
    success: false,
    fallbackMode: false,
    userMessage: '没有可提取的材料，请先上传相关单证。',
    technicalMessage: 'Empty materials list provided',
    logs: [
      createLogEntry({
        level: 'WARN',
        taskId: 'empty',
        message: '接收到空材料列表'
      })
    ]
  }
}

/**
 * 处理所有材料都失败的情况
 */
export async function handleAllMaterialsFailed(
  taskId: string,
  materials: Material[]
): Promise<ErrorHandlerResult> {
  const logs: LogEntry[] = []

  logs.push(createLogEntry({
    level: 'ERROR',
    taskId,
    message: `所有 ${materials.length} 个材料处理失败`
  }))

  return {
    success: false,
    fallbackMode: true,
    userMessage: `所有材料提取失败，共 ${materials.length} 份。请检查文件质量或手动填写信息。`,
    technicalMessage: 'All materials failed to process',
    logs
  }
}

// ============================================================
// 错误类型检测
// ============================================================

/**
 * 判断是否为超时错误
 */
export function isTimeoutError(error: Error): boolean {
  return error.name === 'TimeoutError' ||
    error.message.toLowerCase().includes('timeout') ||
    error.message.toLowerCase().includes('timed out')
}

/**
 * 判断是否为配额错误
 */
export function isQuotaError(error: Error): boolean {
  const msg = error.message
  return msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('quota exceeded') ||
    msg.includes('quotaLimitExceeded') ||
    msg.includes('QUOTA_EXCEEDED') ||
    msg.includes('429')
}

/**
 * 判断是否为认证错误
 */
export function isAuthError(error: Error): boolean {
  const msg = error.message.toLowerCase()
  return msg.includes('authentication') ||
    msg.includes('unauthorized') ||
    msg.includes('401') ||
    msg.includes('403')
}

/**
 * 判断是否为无效响应
 */
export function isInvalidResponseError(responseText: string): boolean {
  try {
    const trimmed = responseText.trim()
    if (!trimmed) return true

    // 尝试解析 JSON
    const firstBrace = trimmed.indexOf('{')
    const lastBrace = trimmed.lastIndexOf('}')
    if (firstBrace === -1 || lastBrace === -1) return true

    return false
  } catch {
    return true
  }
}

// ============================================================
// 并发处理优化
// ============================================================

/**
 * 并发处理多个独立组
 */
export async function processGroupsConcurrently<T>(
  groups: string[],
  processFn: (group: string) => Promise<T>
): Promise<Array<{ group: string; result: T }>> {
  const results = await Promise.allSettled(
    groups.map(group => processFn(group))
  )

  return groups.map((group, index) => {
    const result = results[index]
    return {
      group,
      result: result.status === 'fulfilled' ? result.value : null as unknown as T
    }
  })
}
