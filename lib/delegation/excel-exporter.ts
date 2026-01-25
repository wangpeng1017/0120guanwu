/**
 * @file excel-exporter.ts
 * @desc Excel导出器 - 将委托书和委托协议导出为Excel
 */

import type { DelegationLetter, DelegationAgreement } from '../types/delegation'

/**
 * 导出委托书为Excel Buffer
 */
export function exportDelegationLetterToExcel(data: DelegationLetter): Buffer {
  const XLSX = require('xlsx')

  // 创建工作表数据
  const wsData = [
    ['电子代理报关委托书'],
    [],
    ['一、委托方信息'],
    ['企业名称', data.clientCompanyName || ''],
    ['海关编码', data.clientCustomsCode || ''],
    ['统一社会信用代码', data.clientSocialCreditCode || ''],
    ['授权签字人', data.clientAuthorizedSigner || ''],
    ['联系电话', data.clientContactPhone || ''],
    [],
    ['二、被委托方信息'],
    ['企业名称', data.agentCompanyName || ''],
    ['海关编码', data.agentCustomsCode || ''],
    ['统一社会信用代码', data.agentSocialCreditCode || ''],
    ['授权签字人', data.agentAuthorizedSigner || ''],
    ['联系电话', data.agentContactPhone || ''],
    [],
    ['三、委托关系'],
    ['委托类型', data.delegationType === 'long-term' ? '长期委托' : '单次委托'],
    ['委托有效期', `${data.validityPeriod}个月`],
    ['委托内容', data.delegationContent.join('；')],
    ['签署日期', data.signDate || ''],
    ['状态', getStatusText(data.status)]
  ]

  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // 设置列宽
  ws['!cols'] = [
    { wch: 20 },  // 第一列
    { wch: 50 }   // 第二列
  ]

  // 合并单元格：标题行
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }  // 合并标题
  ]

  // 创建工作簿
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '委托书')

  // 生成Buffer
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

/**
 * 导出委托协议为Excel Buffer
 */
export function exportDelegationAgreementsToExcel(data: DelegationAgreement[]): Buffer {
  const XLSX = require('xlsx')

  // 表头
  const headers = [
    '序号',
    '主要货物名称',
    'HS编码',
    '数量',
    '单位',
    '总值',
    '币种',
    '贸易方式',
    '原产地',
    '进出口日期',
    '状态'
  ]

  // 数据行
  const rows = data.map(item => [
    item.serialNumber,
    item.mainGoodsName,
    item.hsCode,
    item.quantity || '',
    item.unit || '',
    item.totalValue,
    item.currency || 'USD',
    item.tradeMode,
    item.originPlace,
    item.importExportDate,
    getAgreementStatusText(item.agreementStatus)
  ])

  const wsData = [
    ['电子代理报关委托协议'],
    [],
    headers,
    ...rows
  ]

  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // 设置列宽
  ws['!cols'] = [
    { wch: 8 },   // 序号
    { wch: 30 },  // 货物名称
    { wch: 15 },  // HS编码
    { wch: 10 },  // 数量
    { wch: 8 },   // 单位
    { wch: 12 },  // 总值
    { wch: 8 },   // 币种
    { wch: 20 },  // 贸易方式
    { wch: 12 },  // 原产地
    { wch: 12 },  // 日期
    { wch: 12 }   // 状态
  ]

  // 合并单元格：标题行
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }  // 合并标题
  ]

  // 创建工作簿
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '委托协议')

  // 生成Buffer
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

// 辅助函数：获取状态文本
function getStatusText(status?: DelegationLetter['status']): string {
  const map = {
    initiated: '已发起',
    confirmed: '已确认',
    rejected: '已拒绝',
    expired: '已过期',
    terminated: '已终止'
  }
  return status ? map[status] : ''
}

function getAgreementStatusText(status?: DelegationAgreement['agreementStatus']): string {
  const map: Record<NonNullable<DelegationAgreement['agreementStatus']>, string> = {
    pending_confirmation: '待确认',
    sent_to_customs: '已发海关',
    ready_for_declaration: '待申报',
    rejected: '已拒绝',
    in_use: '正使用',
    used_by_customs: '海关已用',
    expired: '已过期',
    cancellation_pending: '撤销待确认',
    cancellation_confirmed: '撤销已确认',
    cancelled: '撤销成功',
    creation_failed: '新增失败',
    cancellation_failed: '撤销失败'
  }
  return status ? map[status] : ''
}
