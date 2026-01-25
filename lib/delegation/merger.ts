/**
 * @file merger.ts
 * @desc 数据合并器 - 智能合并多个Excel文件的数据
 */

import type { ExtractedData, GoodsItem } from './extractor'

/**
 * 合并日志记录
 */
export interface MergeLog {
  field: string          // 字段名
  sourceFile: string     // 来源文件
  priority: number       // 优先级
  reason: string         // 选择原因
}

/**
 * 合并后的数据
 */
export interface MergedData extends ExtractedData {
  mergeLogs: MergeLog[]  // 合并日志
  sourceFiles: string[]  // 参与合并的文件列表
}

/**
 * 计算文件优先级
 * 优先级规则：包含核注清单 > 数据最完整 > 文件名靠前
 */
export function calculateFilePriority(
  fileName: string,
  data: ExtractedData
): number {
  let score = 0

  // 包含核注清单 +100分
  if (data.declaration) {
    score += 100
  }

  // 包含企业信息 +20分
  if (data.enterprise) {
    score += 20
  }

  // 包含客户信息 +10分/每个客户
  if (data.customers) {
    score += data.customers.length * 10
  }

  // 包含商品信息 +5分/每个商品
  if (data.goods) {
    score += data.goods.length * 5
  }

  // 总行数 +0.1分/行
  score += data.totalRows * 0.1

  return score
}

/**
 * 合并企业信息
 * 选择优先级最高的文件的数据
 */
export function mergeEnterpriseInfo(
  dataList: Array<{ fileName: string; data: ExtractedData; priority: number }>
): { result: ExtractedData['enterprise']; logs: MergeLog[] } {
  const logs: MergeLog[] = []

  // 过滤出包含企业信息的文件
  const withEnterprise = dataList.filter(d => d.data.enterprise)

  if (withEnterprise.length === 0) {
    return { result: undefined, logs }
  }

  // 按优先级排序，选择最高的
  withEnterprise.sort((a, b) => b.priority - a.priority)
  const selected = withEnterprise[0]

  logs.push({
    field: 'enterprise',
    sourceFile: selected.fileName,
    priority: selected.priority,
    reason: `选择优先级最高的文件（优先级: ${selected.priority}）`
  })

  return {
    result: selected.data.enterprise,
    logs
  }
}

/**
 * 合并客户供应商信息
 * 按海关编码去重，保留所有不同的客户
 */
export function mergeCustomerInfo(
  dataList: Array<{ fileName: string; data: ExtractedData; priority: number }>
): { result: ExtractedData['customers']; logs: MergeLog[] } {
  const logs: MergeLog[] = []
  const customerMap = new Map<string, { customer: any; source: string; priority: number }>()

  // 按优先级从低到高处理（后处理的优先级高，会覆盖前面的）
  const sorted = [...dataList].sort((a, b) => a.priority - b.priority)

  for (const { fileName, data, priority } of sorted) {
    if (!data.customers) continue

    for (const customer of data.customers) {
      const key = customer.customsCode || customer.name

      // 如果已存在且当前优先级更高，更新
      if (!customerMap.has(key) || customerMap.get(key)!.priority < priority) {
        customerMap.set(key, { customer, source: fileName, priority })

        if (customerMap.size > data.customers.length) {
          logs.push({
            field: 'customer',
            sourceFile: fileName,
            priority,
            reason: `客户 ${customer.name}（编码: ${customer.customsCode}）来自优先级更高的文件`
          })
        }
      }
    }
  }

  const result = Array.from(customerMap.values()).map(v => v.customer)
  return { result, logs }
}

/**
 * 合并核注清单信息
 * 选择优先级最高的文件的数据
 */
export function mergeDeclarationInfo(
  dataList: Array<{ fileName: string; data: ExtractedData; priority: number }>
): { result: ExtractedData['declaration']; logs: MergeLog[] } {
  const logs: MergeLog[] = []

  // 过滤出包含核注清单的文件
  const withDeclaration = dataList.filter(d => d.data.declaration)

  if (withDeclaration.length === 0) {
    return { result: undefined, logs }
  }

  // 按优先级排序，选择最高的
  withDeclaration.sort((a, b) => b.priority - a.priority)
  const selected = withDeclaration[0]

  logs.push({
    field: 'declaration',
    sourceFile: selected.fileName,
    priority: selected.priority,
    reason: `选择优先级最高的文件（优先级: ${selected.priority}）`
  })

  return {
    result: selected.data.declaration,
    logs
  }
}

/**
 * 合并商品列表
 * 智能匹配规则：HS编码 > 货号 > 商品名称
 */
export function mergeGoodsItems(
  dataList: Array<{ fileName: string; data: ExtractedData; priority: number }>
): { result: GoodsItem[]; logs: MergeLog[] } {
  const logs: MergeLog[] = []
  const goodsMap = new Map<string, { item: GoodsItem; source: string; priority: number }>()

  // 按优先级从低到高处理（后处理的优先级高，会覆盖前面的）
  const sorted = [...dataList].sort((a, b) => a.priority - b.priority)

  for (const { fileName, data, priority } of sorted) {
    if (!data.goods) continue

    for (const item of data.goods) {
      const key = item.matchKey

      // 如果已存在且当前优先级更高，合并数据
      if (!goodsMap.has(key)) {
        goodsMap.set(key, { item, source: fileName, priority })
        logs.push({
          field: 'goods',
          sourceFile: fileName,
          priority,
          reason: `新增商品: ${item.goodsName}（匹配键: ${item.matchKey}）`
        })
      } else {
        const existing = goodsMap.get(key)!

        if (priority > existing.priority) {
          // 合并数据：优先使用高优先级的字段，但保留已有的非空字段
          const merged: GoodsItem = {
            ...existing.item,
            ...item,
            // 如果原字段有值而新字段没有，保留原值
            hsCode: item.hsCode || existing.item.hsCode,
            goodsName: item.goodsName || existing.item.goodsName,
            quantity: item.quantity ?? existing.item.quantity,
            unit: item.unit || existing.item.unit,
            unitPrice: item.unitPrice ?? existing.item.unitPrice,
            totalPrice: item.totalPrice ?? existing.item.totalPrice,
            currency: item.currency || existing.item.currency,
            origin: item.origin || existing.item.origin,
            netWeight: item.netWeight ?? existing.item.netWeight,
            grossWeight: item.grossWeight ?? existing.item.grossWeight,
            itemCode: item.itemCode || existing.item.itemCode,
            matchKey: key
          }

          goodsMap.set(key, { item: merged, source: fileName, priority })

          logs.push({
            field: 'goods',
            sourceFile: fileName,
            priority,
            reason: `更新商品: ${item.goodsName}（匹配键: ${key}，优先级更高）`
          })
        }
      }
    }
  }

  const result = Array.from(goodsMap.values()).map(v => v.item)
  return { result, logs }
}

/**
 * 合并多个文件的数据
 */
export function mergeExcelData(
  filesData: Array<{ fileName: string; data: ExtractedData }>
): MergedData {
  // 计算每个文件的优先级
  const dataListWithPriority = filesData.map(({ fileName, data }) => ({
    fileName,
    data,
    priority: calculateFilePriority(fileName, data)
  }))

  // 合并各部分数据
  const enterpriseResult = mergeEnterpriseInfo(dataListWithPriority)
  const customerResult = mergeCustomerInfo(dataListWithPriority)
  const declarationResult = mergeDeclarationInfo(dataListWithPriority)
  const goodsResult = mergeGoodsItems(dataListWithPriority)

  // 汇总所有日志
  const mergeLogs = [
    ...enterpriseResult.logs,
    ...customerResult.logs,
    ...declarationResult.logs,
    ...goodsResult.logs
  ]

  // 计算总行数
  const totalRows = filesData.reduce((sum, f) => sum + f.data.totalRows, 0)

  return {
    enterprise: enterpriseResult.result,
    customers: customerResult.result,
    declaration: declarationResult.result,
    goods: goodsResult.result,
    totalRows,
    mergeLogs,
    sourceFiles: filesData.map(f => f.fileName)
  }
}
