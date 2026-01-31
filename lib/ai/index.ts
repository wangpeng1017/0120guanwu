/**
 * @file index.ts
 * @desc AI 模块导出入口
 * @input 依赖: ./extractor, ./error-handler, ./group-extractor, ./declaration-extractor, ./material-recognizer, ./field-extractor
 * @output 导出: 所有 AI 相关功能
 * @see PRD: docs/PRD.md#F019
 */

// 主提取器（推荐使用）
export {
  extractDeclarationData,
  createMaterialFromUrl,
  createMaterialsFromUrls,
  validateExtractionResult,
  generateExtractionSummary
} from './extractor'

export type {
  ExtractDeclarationDataResult,
  ExtractionOptions
} from './extractor'

// 错误处理
export {
  // 日志功能
  createLogEntry,
  categorizeLogs,
  formatLogSummary,
  logMaterialError,

  // Level 1: 单材料失败处理
  processMaterialsWithFallback,
  getUserMessageForPartialFailure,

  // Level 2: 重试机制
  retryWithBackoff,

  // Level 2: 服务商切换
  callWithProviderFallback,

  // Level 2: 人工处理标记
  markGroupForManualProcessing,
  getManualProcessingMessage,

  // Level 3: 降级策略
  fallbackToOcrText,
  getHistoricalTemplate,
  getManualFormPrompt,
  executeFullFallback,

  // 用户提示
  getUserMessage,
  getActionableUserMessage,
  getLocalizedMessage,

  // 边界处理
  handleEmptyMaterials,
  handleAllMaterialsFailed,

  // 错误类型检测
  isTimeoutError,
  isQuotaError,
  isAuthError,
  isInvalidResponseError,

  // 并发处理
  processGroupsConcurrently
} from './error-handler'

export type {
  MaterialType,
  Material,
  ExtractedValue,
  ExtractedDeclaration,
  ErrorLevel,
  LogEntry,
  ErrorHandlerResult,
  AIProvider,
  RetryOptions,
  RetryResult,
  ProviderFallbackResult,
  MaterialProcessResult,
  CategorizedLogs,
  ManualProcessingStatus
} from './error-handler'

// 分组提取
export {
  groupMaterialsByType,
  extractGroup,
  extractAllGroups,
  mergeGroupResults,
  extractByGroups
} from './group-extractor'

export type {
  GroupExtractResult
} from './group-extractor'

// AI 提取（Gemini）
export {
  extractDeclaration,
  parseAIResponse,
  calculateOverallConfidence,
  getAvailableModels,
  callGemini
} from './declaration-extractor'

export type {
  ProxyConfig,
  ProxyTestResult
} from './declaration-extractor'

// 代理配置工具
export {
  getProxyConfig,
  detectProxyType,
  formatProxyUrlForLog,
  testProxyConnection
} from './declaration-extractor'

// 材料识别
export {
  recognizeMaterialType
} from './material-recognizer'

// 字段提取
export {
  extractFields
} from './field-extractor'
