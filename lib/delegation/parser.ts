/**
 * @file parser.ts
 * @desc Excel文件解析器 - Sheet类型识别
 */

export type SheetType =
  | 'enterprise'    // 企业信息
  | 'customer'      // 客户供应商
  | 'invoice'       // 发票
  | 'packing'       // 装箱单
  | 'declaration'   // 核注清单
  | 'unknown'       // 未知类型

export interface SheetClassification {
  type: SheetType
  confidence: number  // 0-1，识别置信度
  sheetName: string
  dataRows: number    // 有效数据行数
}

export interface ParsedExcelFile {
  fileName: string
  sheets: SheetClassification[]
  priority: number  // 文件优先级（根据完整度计算）
}

/**
 * 分类单个Sheet，识别其类型
 */
export function classifySheet(
  sheetName: string,
  data: any[][]
): SheetClassification {
  const dataRows = data.filter(row => 
    row.some(cell => cell !== null && cell !== '' && cell !== undefined)
  ).length
  
  // 1. 通过Sheet名称精确匹配
  if (sheetName === '企业') {
    return { type: 'enterprise', confidence: 1.0, sheetName, dataRows }
  }
  if (sheetName === '客户供应商') {
    return { type: 'customer', confidence: 1.0, sheetName, dataRows }
  }
  if (sheetName === '核注清单') {
    return { type: 'declaration', confidence: 1.0, sheetName, dataRows }
  }
  if (sheetName.includes('发票')) {
    return { type: 'invoice', confidence: 0.9, sheetName, dataRows }
  }
  if (sheetName.includes('装箱')) {
    return { type: 'packing', confidence: 0.9, sheetName, dataRows }
  }
  
  // 2. 通过表头字段模糊匹配
  const headers = data.slice(0, 20).flat().join('|').toLowerCase()
  
  if (headers.includes('加工单位编码') || headers.includes('加工单位名称')) {
    return { type: 'enterprise', confidence: 0.8, sheetName, dataRows }
  }
  if (headers.includes('单位代码') && headers.includes('单位名称')) {
    return { type: 'customer', confidence: 0.8, sheetName, dataRows }
  }
  if (headers.includes('监管方式') && headers.includes('备案编号')) {
    return { type: 'declaration', confidence: 0.8, sheetName, dataRows }
  }
  if (headers.includes('hs编码') && headers.includes('总价')) {
    return { type: 'invoice', confidence: 0.7, sheetName, dataRows }
  }
  if (headers.includes('净重') && headers.includes('毛重')) {
    return { type: 'packing', confidence: 0.7, sheetName, dataRows }
  }
  
  return { type: 'unknown', confidence: 0, sheetName, dataRows }
}

/**
 * 计算文件优先级
 */
export function calculateFilePriority(
  sheets: SheetClassification[]
): number {
  let score = 0
  
  // 包含核注清单 +100分
  if (sheets.some(s => s.type === 'declaration')) {
    score += 100
  }
  
  // 每个已识别的sheet +10分
  const identifiedSheets = sheets.filter(s => s.type !== 'unknown')
  score += identifiedSheets.length * 10
  
  // 数据完整度：总行数
  const totalRows = sheets.reduce((sum, s) => sum + s.dataRows, 0)
  score += Math.floor(totalRows / 100)
  
  return score
}

/**
 * 解析整个Excel文件，识别所有Sheet类型
 */
export function parseExcelFile(
  fileName: string,
  workbook: any
): ParsedExcelFile {
  const XLSX = require('xlsx')
  
  const sheets: SheetClassification[] = workbook.SheetNames.map((sheetName: string) => {
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
    return classifySheet(sheetName, data)
  })
  
  const priority = calculateFilePriority(sheets)
  
  return {
    fileName,
    sheets,
    priority
  }
}
