/**
 * @file mapper.ts
 * @desc 数据映射器 - 将提取的数据映射到委托书和委托协议
 */

import type { DelegationLetter, DelegationAgreement } from '../types/delegation'
import type { MergedData } from './merger'

/**
 * 映射结果
 */
export interface MappingResult {
  delegationLetter: DelegationLetter
  delegationAgreements: DelegationAgreement[]
  warnings: string[]  // 映射警告（如缺少必填字段）
}

/**
 * 将合并数据映射到委托书
 */
export function mapToDelegationLetter(data: MergedData): {
  result: DelegationLetter
  warnings: string[]
} {
  const warnings: string[] = []

  // 委托方（客户）信息
  let clientInfo
  if (!data.customers || data.customers.length === 0) {
    warnings.push('缺少客户信息，委托方字段将为空')
  } else {
    if (data.customers.length > 1) {
      warnings.push(`发现多个客户（${data.customers.length}个），将使用第一个客户作为委托方`)
    }
    clientInfo = data.customers[0]
  }

  // 被委托方（报关企业）信息
  if (!data.enterprise) {
    warnings.push('缺少企业信息，被委托方字段将为空')
  }

  const delegationLetter: DelegationLetter = {
    // 委托方
    clientCompanyName: clientInfo?.name,
    clientCustomsCode: clientInfo?.customsCode || '',
    clientSocialCreditCode: clientInfo?.socialCreditCode,

    // 被委托方
    agentCompanyName: data.enterprise?.name,
    agentCustomsCode: data.enterprise?.customsCode,
    agentSocialCreditCode: data.enterprise?.socialCreditCode,
    agentAuthorizedSigner: data.enterprise?.legalPerson,
    agentContactPhone: data.enterprise?.phone,

    // 委托关系（默认值）
    delegationType: 'long-term',
    validityPeriod: '12',
    delegationContent: [
      '办理进出口货物的报关、报检手续',
      '代缴相关税费',
      '办理海关查验',
      '提交或修改报关单证',
      '签收海关法律文书'
    ],
    signDate: new Date().toISOString().split('T')[0],
    status: 'initiated'
  }

  return { result: delegationLetter, warnings }
}

/**
 * 将商品明细映射到委托协议数组
 */
export function mapToDelegationAgreements(
  data: MergedData
): {
  result: DelegationAgreement[]
  warnings: string[]
} {
  const warnings: string[] = []

  if (!data.goods || data.goods.length === 0) {
    warnings.push('缺少商品明细，无法生成委托协议')
    return { result: [], warnings }
  }

  // 从核注清单获取贸易信息
  const tradeMode = data.declaration?.supervisionMode || '一般贸易'
  const importExportDate = data.declaration?.entryDate || new Date().toISOString().split('T')[0]

  // 将每个商品映射为一条委托协议
  const agreements: DelegationAgreement[] = data.goods.map((item, index) => {
    const agreement: DelegationAgreement = {
      serialNumber: index + 1,
      mainGoodsName: item.goodsName,
      hsCode: item.hsCode,
      totalValue: item.totalPrice || 0,
      currency: item.currency || 'USD',
      quantity: item.quantity,
      unit: item.unit,
      tradeMode,
      originPlace: item.origin || '未知',
      importExportDate,
      agreementStatus: 'pending_confirmation'
    }

    return agreement
  })

  if (!data.declaration) {
    warnings.push('缺少核注清单信息，贸易方式和进出口日期使用默认值')
  }

  return { result: agreements, warnings }
}

/**
 * 完整映射：从合并数据生成委托书和委托协议
 */
export function mapDelegationData(data: MergedData): MappingResult {
  const letterResult = mapToDelegationLetter(data)
  const agreementsResult = mapToDelegationAgreements(data)

  return {
    delegationLetter: letterResult.result,
    delegationAgreements: agreementsResult.result,
    warnings: [...letterResult.warnings, ...agreementsResult.warnings]
  }
}
