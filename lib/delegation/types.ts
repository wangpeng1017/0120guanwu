/**
 * @file types.ts
 * @desc 委托材料生成系统的类型定义
 * @see PRD: docs/delegation/PRD.md
 */

// ============================================================
// Sheet 类型识别
// ============================================================

/**
 * Excel Sheet 类型枚举
 */
export type SheetType =
  | 'INVOICE'           // 商业发票
  | 'PACKING_LIST'      // 装箱单
  | 'CONTRACT'          // 合同
  | 'COMBINED'          // 发票箱单合一
  | 'CAR_LIST'          // 汽车清单（特殊）
  | 'UNKNOWN'           // 未知类型

/**
 * Sheet 识别结果
 */
export interface SheetIdentification {
  sheetName: string
  sheetType: SheetType
  confidence: number       // 0-1 置信度
  indicators: string[]     // 识别依据
}

// ============================================================
// 数据提取
// ============================================================

/**
 * 企业信息
 */
export interface CompanyInfo {
  name: string                    // 企业名称
  nameEn?: string                 // 英文名称
  address?: string                // 地址
  addressEn?: string              // 英文地址
  contact?: string                // 联系人
  phone?: string                  // 电话
  fax?: string                    // 传真
  customsCode?: string            // 海关编码
  socialCreditCode?: string       // 统一社会信用代码
}

/**
 * 客户信息（境外收发货人）
 */
export interface CustomerInfo {
  name: string                    // 客户名称
  nameEn?: string                 // 英文名称
  country?: string                // 国家
  address?: string                // 地址
  contact?: string                // 联系人
}

/**
 * 商品信息
 */
export interface GoodsItem {
  itemNo: number                  // 项号
  goodsName: string               // 商品名称
  goodsNameEn?: string            // 英文名称
  specs?: string                  // 规格型号
  hsCode?: string                 // HS编码
  quantity: number                // 数量
  unit: string                    // 单位
  unitPrice: number               // 单价
  totalPrice: number              // 总价
  currency: string                // 币制
  countryOfOrigin?: string        // 原产国
  netWeight?: number              // 净重(KG)
  grossWeight?: number            // 毛重(KG)
  // 汽车特有字段
  vin?: string                    // VIN码（车架号）
  brand?: string                  // 品牌
  model?: string                  // 型号
  engineNo?: string               // 发动机号
  color?: string                  // 颜色
}

/**
 * 单据头信息
 */
export interface DocumentHeader {
  invoiceNo?: string              // 发票号
  invoiceDate?: string            // 发票日期
  contractNo?: string             // 合同号
  poNo?: string                   // 采购订单号
  blNo?: string                   // 提单号
  vesselName?: string             // 船名
  voyageNo?: string               // 航次
  portOfLoading?: string          // 装货港
  portOfDischarge?: string        // 卸货港
  tradeTerms?: string             // 贸易条款（FOB/CIF/CFR等）
  paymentTerms?: string           // 付款条款
  packageCount?: number           // 件数
  packageType?: string            // 包装种类
  grossWeight?: number            // 总毛重
  netWeight?: number              // 总净重
  totalAmount?: number            // 总金额
  currency?: string               // 币制
}

/**
 * 从单个Sheet提取的数据
 */
export interface ExtractedSheetData {
  sheetName: string
  sheetType: SheetType
  company?: CompanyInfo           // 发货企业
  customer?: CustomerInfo         // 收货客户
  header?: DocumentHeader         // 单据头
  items: GoodsItem[]              // 商品列表
  rawData?: Record<string, unknown>  // 原始数据
}

/**
 * 从整个Excel提取的数据
 */
export interface ExtractedExcelData {
  fileName: string
  sheets: ExtractedSheetData[]
  extractedAt: string
}

// ============================================================
// 数据合并
// ============================================================

/**
 * 数据源优先级
 */
export type DataSourcePriority = 'CONTRACT' | 'INVOICE' | 'PACKING_LIST' | 'CAR_LIST'

/**
 * 合并配置
 */
export interface MergeConfig {
  priorityOrder: DataSourcePriority[]  // 优先级顺序（高到低）
  matchStrategy: 'VIN' | 'ITEM_NO' | 'NAME'  // 商品匹配策略
  keepAllItems: boolean            // 是否保留所有商品（即使无法匹配）
}

/**
 * 合并后的商品数据
 */
export interface MergedGoodsItem extends GoodsItem {
  sources: {
    source: DataSourcePriority
    sheetName: string
  }[]
  matchConfidence: number          // 匹配置信度
}

/**
 * 合并后的完整数据
 */
export interface MergedData {
  company: CompanyInfo
  customer: CustomerInfo
  header: DocumentHeader
  items: MergedGoodsItem[]
  mergeReport: {
    totalSources: number
    itemsMatched: number
    itemsUnmatched: number
    conflicts: string[]
  }
}

// ============================================================
// 委托书/协议映射
// ============================================================

/**
 * 委托书映射结果
 */
export interface DelegationLetterData {
  // 委托方信息
  clientCompanyName: string
  clientCustomsCode: string
  clientSocialCreditCode?: string
  clientAuthorizedSigner?: string

  // 被委托方信息
  agentCompanyName: string
  agentCustomsCode: string
  agentSocialCreditCode?: string
  agentAuthorizedSigner?: string

  // 委托关系
  delegationType: 'single' | 'long-term'
  validityPeriod: '3' | '6' | '9' | '12'
  delegationContent: string[]
  signDate: string
}

/**
 * 委托协议映射结果
 */
export interface DelegationAgreementData {
  serialNumber: number
  mainGoodsName: string
  hsCode: string
  totalValue: number
  currency: string
  tradeMode: string
  originPlace: string
  importExportDate: string
  otherRequirements?: string
  clientContactPhone?: string
}

/**
 * 完整的委托材料数据
 */
export interface DelegationPackageData {
  letter: DelegationLetterData
  agreements: DelegationAgreementData[]
}

// ============================================================
// 解析器配置
// ============================================================

/**
 * 业务类型配置
 */
export interface BusinessTypeConfig {
  type: 'CAR' | 'LIGHT' | 'ECOMMERCE' | 'GENERAL'
  sheetPatterns: {
    invoice: RegExp[]
    packingList: RegExp[]
    contract: RegExp[]
    carList?: RegExp[]
  }
  fieldMappings: Record<string, string[]>  // 字段名 -> 可能的列名
}

/**
 * 默认业务类型配置
 */
export const DEFAULT_BUSINESS_CONFIGS: Record<string, BusinessTypeConfig> = {
  CAR: {
    type: 'CAR',
    sheetPatterns: {
      invoice: [/invoice/i, /发票/],
      packingList: [/packing/i, /装箱/],
      contract: [/contract/i, /合同/],
      carList: [/car\s*list/i, /汽车清单/, /车辆明细/]
    },
    fieldMappings: {
      vin: ['VIN', 'VIN码', '车架号', 'CHASSIS NO', 'FRAME NO'],
      brand: ['BRAND', '品牌', 'MAKE'],
      model: ['MODEL', '型号', '车型'],
      color: ['COLOR', '颜色', 'COLOUR'],
      engineNo: ['ENGINE NO', '发动机号', 'ENGINE NUMBER']
    }
  },
  LIGHT: {
    type: 'LIGHT',
    sheetPatterns: {
      invoice: [/invoice/i, /发票/],
      packingList: [/packing/i, /装箱/],
      contract: [/contract/i, /合同/]
    },
    fieldMappings: {
      productCode: ['ITEM NO', '货号', '产品编号', 'SKU'],
      material: ['MATERIAL', '材质', '材料'],
      wattage: ['WATTAGE', '瓦数', 'W', '功率']
    }
  },
  ECOMMERCE: {
    type: 'ECOMMERCE',
    sheetPatterns: {
      invoice: [/invoice/i, /发票/],
      packingList: [/packing/i, /装箱/],
      contract: [/contract/i, /合同/]
    },
    fieldMappings: {
      sku: ['SKU', '商品编码', 'ITEM CODE'],
      barcode: ['BARCODE', '条形码', 'EAN'],
      category: ['CATEGORY', '类目', '分类']
    }
  },
  GENERAL: {
    type: 'GENERAL',
    sheetPatterns: {
      invoice: [/invoice/i, /发票/, /COMMERCIAL/i],
      packingList: [/packing/i, /装箱/, /P\/L/i],
      contract: [/contract/i, /合同/, /AGREEMENT/i]
    },
    fieldMappings: {}
  }
}
