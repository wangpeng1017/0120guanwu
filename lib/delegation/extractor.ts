/**
 * @file extractor.ts
 * @desc 数据提取器 - 从不同Sheet提取结构化数据
 */

export interface EnterpriseInfo {
  name: string
  customsCode: string
  socialCreditCode: string
  legalPerson?: string
  phone?: string
}

export interface CustomerInfo {
  name: string
  customsCode: string
  socialCreditCode?: string
  englishName?: string
}

export interface DeclarationInfo {
  supervisionMode: string      // 监管方式
  recordNumber: string          // 备案编号
  importExportFlag: string      // 进出口标志
  entryDate?: string           // 录入日期
  operatingUnitName?: string   // 经营单位名称
  operatingUnitCode?: string   // 经营单位代码
}

export interface GoodsItem {
  goodsName: string
  hsCode: string
  quantity?: number
  unit?: string
  unitPrice?: number
  totalPrice?: number
  currency?: string
  origin?: string
  netWeight?: number
  grossWeight?: number
  itemCode?: string      // 货号/料号
  matchKey: string       // 用于匹配的唯一标识
}

export interface ExtractedData {
  enterprise?: EnterpriseInfo
  customers?: CustomerInfo[]
  declaration?: DeclarationInfo
  goods?: GoodsItem[]
  totalRows: number  // 总数据行数
}

/**
 * 字段别名映射
 */
export const FIELD_ALIASES = {
  hsCode: ['HS编码', '商品HS编码', '商品编码', 'HS CODE'],
  goodsName: ['商品名称', '品名', '货物名称', 'DESCRIPTION', 'Description&Specification'],
  totalPrice: ['总价', '总金额', 'AMOUNT', '金额', 'Amount'],
  origin: ['原产国', '原产地', '产地', 'ORIGIN', '原产国/地区'],
  quantity: ['数量', '数  量', 'QTY', 'Qty'],
  unit: ['单位', 'UNIT', 'Unit'],
  unitPrice: ['单价', 'UNIT PRICE', 'Unit Price'],
  netWeight: ['净重', '净重（千克）', 'N/W', 'N/W(KG)'],
  grossWeight: ['毛重', '毛重（千克）', 'G/W', 'G/W(KG)'],
  itemCode: ['货号', '料号', '企业料号', '金二料号', '合捷货号']
} as const

/**
 * 从企业Sheet提取数据
 */
export function extractEnterpriseInfo(data: any[][]): EnterpriseInfo | null {
  if (!data || data.length < 2) return null

  // 查找表头行
  const headerRow = findHeaderRow(data, ['加工单位名称', '加工单位编码'])
  if (headerRow === -1 || headerRow >= data.length - 1) return null

  const headers = data[headerRow]
  const dataRow = data[headerRow + 1]

  if (!dataRow) return null

  // 查找各字段的列索引
  const nameIdx = findColumnIndex(headers, ['加工单位名称', '单位名称', '企业名称'])
  const codeIdx = findColumnIndex(headers, ['加工单位编码', '单位编码', '海关编码'])
  const creditIdx = findColumnIndex(headers, ['加工单位三证合一代码', '三证合一代码', '统一社会信用代码'])
  const legalIdx = findColumnIndex(headers, ['加工单位法人代表', '法人代表', '法人'])
  const phoneIdx = findColumnIndex(headers, ['加工单位联系电话', '联系电话', '电话'])

  const name = nameIdx >= 0 ? String(dataRow[nameIdx] || '') : ''
  const customsCode = codeIdx >= 0 ? String(dataRow[codeIdx] || '') : ''

  if (!name && !customsCode) return null

  return {
    name,
    customsCode,
    socialCreditCode: creditIdx >= 0 ? String(dataRow[creditIdx] || '') : '',
    legalPerson: legalIdx >= 0 ? String(dataRow[legalIdx] || '') : undefined,
    phone: phoneIdx >= 0 ? String(dataRow[phoneIdx] || '') : undefined
  }
}

/**
 * 从客户供应商Sheet提取数据
 */
export function extractCustomerInfo(data: any[][]): CustomerInfo[] {
  if (!data || data.length < 2) return []

  // 查找表头行
  const headerRow = findHeaderRow(data, ['单位名称', '单位代码'])
  if (headerRow === -1 || headerRow >= data.length - 1) return []

  const headers = data[headerRow]

  // 查找各字段的列索引
  const nameIdx = findColumnIndex(headers, ['单位名称', '客户名称', '供应商名称'])
  const codeIdx = findColumnIndex(headers, ['单位代码', '客户代码', '海关编码'])
  const creditIdx = findColumnIndex(headers, ['三证合一代码', '统一社会信用代码'])
  const englishIdx = findColumnIndex(headers, ['单位英文名', '英文名称', 'English Name'])

  const customers: CustomerInfo[] = []

  // 从表头下一行开始提取所有数据行
  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i]
    if (!row) continue

    const name = nameIdx >= 0 ? String(row[nameIdx] || '').trim() : ''
    const customsCode = codeIdx >= 0 ? String(row[codeIdx] || '').trim() : ''

    // 至少要有名称或代码
    if (!name && !customsCode) continue

    customers.push({
      name,
      customsCode,
      socialCreditCode: creditIdx >= 0 ? String(row[creditIdx] || '').trim() : undefined,
      englishName: englishIdx >= 0 ? String(row[englishIdx] || '').trim() : undefined
    })
  }

  return customers
}

/**
 * 从核注清单Sheet提取数据
 */
export function extractDeclarationInfo(data: any[][]): DeclarationInfo | null {
  if (!data || data.length < 2) return null

  // 查找表头行
  const headerRow = findHeaderRow(data, ['监管方式', '备案编号'])
  if (headerRow === -1 || headerRow >= data.length - 1) return null

  const headers = data[headerRow]
  const dataRow = data[headerRow + 1]

  if (!dataRow) return null

  // 查找各字段的列索引
  const modeIdx = findColumnIndex(headers, ['监管方式', '贸易方式'])
  const recordIdx = findColumnIndex(headers, ['备案编号', '账册编号'])
  const flagIdx = findColumnIndex(headers, ['进出口标志', '进出口'])
  const dateIdx = findColumnIndex(headers, ['录入日期', '日期', '申报日期'])
  const unitNameIdx = findColumnIndex(headers, ['经营单位名称', '经营单位'])
  const unitCodeIdx = findColumnIndex(headers, ['经营单位代码'])

  const supervisionMode = modeIdx >= 0 ? String(dataRow[modeIdx] || '').trim() : ''
  const recordNumber = recordIdx >= 0 ? String(dataRow[recordIdx] || '').trim() : ''
  const importExportFlag = flagIdx >= 0 ? String(dataRow[flagIdx] || '').trim() : ''

  if (!supervisionMode && !recordNumber) return null

  return {
    supervisionMode,
    recordNumber,
    importExportFlag,
    entryDate: dateIdx >= 0 ? String(dataRow[dateIdx] || '').trim() : undefined,
    operatingUnitName: unitNameIdx >= 0 ? String(dataRow[unitNameIdx] || '').trim() : undefined,
    operatingUnitCode: unitCodeIdx >= 0 ? String(dataRow[unitCodeIdx] || '').trim() : undefined
  }
}

/**
 * 智能查找表头行（处理表头位置不固定的情况）
 */
export function findHeaderRow(data: any[][], keywords: string[]): number {
  const searchLimit = Math.min(20, data.length)

  for (let i = 0; i < searchLimit; i++) {
    const row = data[i]
    if (!row) continue

    const rowText = row.join('|').toLowerCase()
    const matchCount = keywords.filter(keyword =>
      rowText.includes(keyword.toLowerCase())
    ).length

    // 至少匹配一半关键字
    if (matchCount >= Math.ceil(keywords.length / 2)) {
      return i
    }
  }

  return 0
}

/**
 * 从发票/装箱单Sheet提取商品明细
 */
export function extractGoodsItems(data: any[][], sheetType: 'invoice' | 'packing'): GoodsItem[] {
  if (!data || data.length < 2) return []

  // 查找表头行（根据HS编码和商品名称字段）
  const headerRow = findHeaderRow(data, ['HS编码', '商品名称'])
  if (headerRow === -1 || headerRow >= data.length - 1) return []

  const headers = data[headerRow]

  // 查找各字段的列索引
  const hsCodeIdx = findColumnIndex(headers, FIELD_ALIASES.hsCode)
  const goodsNameIdx = findColumnIndex(headers, FIELD_ALIASES.goodsName)
  const quantityIdx = findColumnIndex(headers, FIELD_ALIASES.quantity)
  const unitIdx = findColumnIndex(headers, FIELD_ALIASES.unit)
  const unitPriceIdx = findColumnIndex(headers, FIELD_ALIASES.unitPrice)
  const totalPriceIdx = findColumnIndex(headers, FIELD_ALIASES.totalPrice)
  const originIdx = findColumnIndex(headers, FIELD_ALIASES.origin)
  const netWeightIdx = findColumnIndex(headers, FIELD_ALIASES.netWeight)
  const grossWeightIdx = findColumnIndex(headers, FIELD_ALIASES.grossWeight)
  const itemCodeIdx = findColumnIndex(headers, FIELD_ALIASES.itemCode)

  const items: GoodsItem[] = []

  // 从表头下一行开始提取所有数据行
  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i]
    if (!row) continue

    // 检查是否为空行
    const hasContent = row.some(cell => cell !== null && cell !== '' && cell !== undefined)
    if (!hasContent) continue

    // 过滤汇总行（包含"合计"、"总计"等关键字）
    const rowText = row.join('').toLowerCase()
    if (rowText.includes('合计') || rowText.includes('总计') || rowText.includes('小计')) {
      continue
    }

    const hsCode = hsCodeIdx >= 0 ? String(row[hsCodeIdx] || '').trim() : ''
    const goodsName = goodsNameIdx >= 0 ? String(row[goodsNameIdx] || '').trim() : ''

    // 至少要有HS编码或商品名称
    if (!hsCode && !goodsName) continue

    // 解析数值字段
    const parseNumber = (value: any): number | undefined => {
      if (value === null || value === '' || value === undefined) return undefined
      const num = Number(value)
      return isNaN(num) ? undefined : num
    }

    const item: GoodsItem = {
      hsCode,
      goodsName,
      quantity: quantityIdx >= 0 ? parseNumber(row[quantityIdx]) : undefined,
      unit: unitIdx >= 0 ? String(row[unitIdx] || '').trim() : undefined,
      unitPrice: unitPriceIdx >= 0 ? parseNumber(row[unitPriceIdx]) : undefined,
      totalPrice: totalPriceIdx >= 0 ? parseNumber(row[totalPriceIdx]) : undefined,
      origin: originIdx >= 0 ? String(row[originIdx] || '').trim() : undefined,
      netWeight: netWeightIdx >= 0 ? parseNumber(row[netWeightIdx]) : undefined,
      grossWeight: grossWeightIdx >= 0 ? parseNumber(row[grossWeightIdx]) : undefined,
      itemCode: itemCodeIdx >= 0 ? String(row[itemCodeIdx] || '').trim() : undefined,
      matchKey: '' // 后面生成
    }

    // 生成匹配键
    item.matchKey = generateMatchKey(item)

    items.push(item)
  }

  return items
}

/**
 * 根据字段别名查找实际列索引
 */
export function findColumnIndex(headers: any[], fieldAliases: readonly string[]): number {
  const normalizedHeaders = headers.map(h =>
    String(h || '').toLowerCase().trim()
  )

  const normalizedAliases = Array.from(fieldAliases).map(a =>
    a.toLowerCase().trim()
  )

  for (let i = 0; i < normalizedHeaders.length; i++) {
    const header = normalizedHeaders[i]
    if (normalizedAliases.some(alias => header.includes(alias) || alias.includes(header))) {
      return i
    }
  }

  return -1
}

/**
 * 生成商品匹配键
 */
export function generateMatchKey(item: Partial<GoodsItem>): string {
  // 优先级：HS编码 > 货号 > 商品名称
  if (item.hsCode && item.hsCode.trim()) {
    return `HS:${item.hsCode.trim()}`
  }
  if (item.itemCode && item.itemCode.trim()) {
    return `CODE:${item.itemCode.trim()}`
  }
  if (item.goodsName && item.goodsName.trim()) {
    return `NAME:${item.goodsName.trim()}`
  }
  return 'UNKNOWN'
}

/**
 * 从整个Excel文件提取所有数据
 */
export function extractDataFromFile(
  workbook: any,
  parsedFile: any
): ExtractedData {
  const XLSX = require('xlsx')

  const result: ExtractedData = {
    totalRows: 0
  }

  // 遍历所有已分类的sheet
  for (const sheet of parsedFile.sheets) {
    const worksheet = workbook.Sheets[sheet.sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

    switch (sheet.type) {
      case 'enterprise':
        if (!result.enterprise) {
          result.enterprise = extractEnterpriseInfo(data) || undefined
        }
        break

      case 'customer':
        if (!result.customers) {
          result.customers = extractCustomerInfo(data)
        }
        break

      case 'declaration':
        if (!result.declaration) {
          result.declaration = extractDeclarationInfo(data) || undefined
        }
        break

      case 'invoice':
      case 'packing':
        const items = extractGoodsItems(data, sheet.type)
        if (!result.goods) {
          result.goods = items
        } else {
          // 合并商品列表
          result.goods.push(...items)
        }
        break
    }

    result.totalRows += sheet.dataRows
  }

  return result
}
