/**
 * @file delegation.ts
 * @desc 代理报关委托书和委托协议的数据结构定义
 * @see PRD: 基于《电子代理报关委托.pdf》的字段要求
 */

/**
 * 委托书（代理报关委托书）数据结构
 * 对应PDF中的 4.2.1 发起委托申请
 */
export interface DelegationLetter {
  // ========== 委托方信息 ==========
  /** 委托方统一社会信用代码 */
  clientSocialCreditCode?: string
  /** 委托方企业海关编码（10位数） */
  clientCustomsCode: string
  /** 委托方企业名称 */
  clientCompanyName?: string
  /** 委托方法定代表人授权签署人 */
  clientAuthorizedSigner?: string
  /** 委托方联系电话 */
  clientContactPhone?: string

  // ========== 被委托方信息 ==========
  /** 被委托方统一社会信用代码 */
  agentSocialCreditCode?: string
  /** 被委托方企业海关编码 */
  agentCustomsCode?: string
  /** 被委托方企业名称 */
  agentCompanyName?: string
  /** 被委托方法人代表授权签署人 */
  agentAuthorizedSigner?: string
  /** 被委托方联系电话 */
  agentContactPhone?: string

  // ========== 委托关系信息 ==========
  /** 委托方式：逐票 | 长期 */
  delegationType: 'single' | 'long-term'
  /** 委托关系有效期：3个月 | 6个月 | 9个月 | 12个月 */
  validityPeriod: '3' | '6' | '9' | '12'
  /** 委托内容（可多选） */
  delegationContent: string[]
  /** 签订日期 */
  signDate?: string
  /** 委托书编号 */
  letterNumber?: string
  /** 有效截止日期 */
  expiryDate?: string
  /** 委托关系状态：发起 | 确认 | 拒绝 | 过期作废 | 终止 */
  status?: 'initiated' | 'confirmed' | 'rejected' | 'expired' | 'terminated'
  /** 委托协议份数 */
  agreementCount?: number
}

/**
 * 委托协议数据结构
 * 对应PDF中的 4.2.2 签订委托协议
 */
export interface DelegationAgreement {
  // ========== 关联委托关系 ==========
  /** 委托方统一社会信用代码 */
  clientSocialCreditCode?: string
  /** 委托方企业海关编码 */
  clientCustomsCode?: string
  /** 委托书编号 */
  letterNumber?: string

  // ========== 被委托方信息（从委托关系继承） ==========
  /** 被委托方统一社会信用代码 */
  agentSocialCreditCode?: string
  /** 被委托方企业海关编码 */
  agentCustomsCode?: string
  /** 被委托方企业名称 */
  agentCompanyName?: string
  /** 被委托方法人代表授权签署人 */
  agentAuthorizedSigner?: string

  // ========== 委托方信息（从委托关系继承） ==========
  /** 委托方企业名称 */
  clientCompanyName?: string
  /** 委托方法人代表授权签署人 */
  clientAuthorizedSigner?: string
  /** 委托关系状态 */
  relationStatus?: string
  /** 委托协议份数 */
  agreementCount?: number
  /** 自动确认 */
  autoConfirm?: boolean
  /** 签订日期 */
  signDate?: string
  /** 委托关系有效期 */
  validityPeriod?: string
  /** 委托方式 */
  delegationType?: string
  /** 有效截止日期 */
  expiryDate?: string
  /** 委托内容 */
  delegationContent?: string[]

  // ========== 协议具体内容（必填字段） ==========
  /** 序号 */
  serialNumber: number
  /** 主要货物名称 */
  mainGoodsName: string
  /** HS编码 */
  hsCode: string
  /** 货物总价 */
  totalValue: number
  /** 货物总价币制（默认美元） */
  currency?: string
  /** 数量 */
  quantity?: number
  /** 单位 */
  unit?: string
  /** 贸易方式 */
  tradeMode: string
  /** 原产地/货源地 */
  originPlace: string
  /** 进/出口日期 */
  importExportDate: string
  /** 其他要求 */
  otherRequirements?: string
  /** 委托方联系电话 */
  clientContactPhone?: string

  // ========== 被委托方填写字段 ==========
  /** 收到单证情况（可多选） */
  receivedDocuments?: string[]
  /** 收到证件日期 */
  receivedDate?: string
  /** 报关收费 */
  customsFee?: string
  /** 承诺说明 */
  commitmentNote?: string
  /** 被委托方联系电话 */
  agentContactPhone?: string

  // ========== 协议状态 ==========
  /**
   * 委托协议状态：
   * 0-发起待确认 | 1-协议确认已发海关 | 2-委托协议可报关 |
   * 3-委托发起被拒绝 | 4-委托协��正使用 | 5-委托协议海关已用 |
   * 6-委托协议过期 | 7-委托撤销待确认 | 8-委托撤销已确认 |
   * 9-协议撤销成功 | 10-委托协议新增失败 | 11-委托协议撤销失败
   */
  agreementStatus?:
    | 'pending_confirmation'      // 0-发起待确认
    | 'sent_to_customs'           // 1-协议确认已发海关
    | 'ready_for_declaration'     // 2-委托协议可报关
    | 'rejected'                  // 3-委托发起被拒绝
    | 'in_use'                    // 4-委托协议正使用
    | 'used_by_customs'           // 5-委托协议海关已用
    | 'expired'                   // 6-委托协议过期
    | 'cancellation_pending'      // 7-委托撤销待确认
    | 'cancellation_confirmed'    // 8-委托撤销已确认
    | 'cancelled'                 // 9-协议撤销成功
    | 'creation_failed'           // 10-委托协议新增失败
    | 'cancellation_failed'       // 11-委托协议撤销失败

  /** 委托协议编号 */
  agreementNumber?: string
}

/**
 * 委托内容枚举（根据PDF第20页）
 */
export const DELEGATION_CONTENT_OPTIONS = [
  '进出口货物收发货人',
  '运输工具负责人',
  '物品所有人',
  '向海关办理报关手续',
  '缴纳税费',
  '其他委托事项'
] as const

/**
 * 贸易方式枚举（常见类型）
 */
export const TRADE_MODE_OPTIONS = [
  '一般贸易',
  '加工贸易',
  '保税监管',
  '其他贸易'
] as const

/**
 * 收到单证情况枚举
 */
export const RECEIVED_DOCUMENTS_OPTIONS = [
  '合同',
  '发票',
  '装箱单',
  '提单',
  '原产地证',
  '其他单证'
] as const
