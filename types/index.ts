// ============================================================
// 业务类型定义（与 Prisma Schema 对齐）
// ============================================================

export type BusinessDirection = 'IMPORT' | 'EXPORT' | 'TRANSFER';
export type SupervisionLevel = 'FIRST' | 'SECOND';
export type TradeMode = 'GENERAL' | 'PROCESSING';

export interface BusinessType {
  direction: BusinessDirection;
  level: SupervisionLevel;
  mode: TradeMode;
}

// 任务状态（与 Prisma TaskStatus 枚举对齐）
export type TaskStatus = 'DRAFT' | 'UPLOADING' | 'EXTRACTING' | 'EDITING' | 'GENERATING' | 'COMPLETED' | 'FAILED';

// 单据类型（与 Prisma MaterialType 枚举对齐）
export type MaterialType = 'BILL_OF_LADING' | 'COMMERCIAL_INVOICE' | 'PACKING_LIST' | 'CONTRACT' | 'CERTIFICATE' | 'CUSTOMS_DECLARATION' | 'BONDED_NOTE' | 'OTHER';

// 文件类型别名（兼容性）
export type FileType = MaterialType;

// ============================================================
// Prisma 模型类型
// ============================================================

export interface Task {
  id: string;
  taskNo: string;
  businessCategory: 'BONDED_ZONE' | 'PORT' | 'GENERAL';
  businessType: string;
  bondedZoneType: string | null;
  portType: string | null;
  status: TaskStatus;
  preEntryNo: string | null;
  customsNo: string | null;
  materials: Material[];
  declarations: Declaration[];
  generatedFiles: GeneratedFile[];
  operationLogs: OperationLog[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Material {
  id: string;
  taskId: string;
  materialType: MaterialType;
  originalName: string;
  storedName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  extractedData: unknown | null;
  createdAt: Date;
}

export interface Declaration {
  id: string;
  taskId: string;
  headerData: Record<string, unknown>;
  bodyData: unknown;
  confidenceScore: number | null;
  isConfirmed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeneratedFile {
  id: string;
  taskId: string;
  fileType: string;
  fileName: string;
  fileUrl: string;
  downloadCount: number;
  createdAt: Date;
}

export interface OperationLog {
  id: string;
  taskId: string;
  action: string;
  details: unknown | null;
  operator: string | null;
  createdAt: Date;
}

// ============================================================
// 报关单完整字段定义（28个表头字段）
// ============================================================

export interface DeclarationHeader {
  // 1. 预录入编号
  preEntryNo: string;
  // 2. 海关编号
  customsNo: string;
  // 3. 境内收发货人（名称+编码）
  domesticConsignee: string;
  // 4. 境外收发货人
  overseasConsignee: string;
  // 5. 申报单位
  declarant: string;
  // 6. 运输方式
  transportMode: string;
  // 7. 运输工具名称
  vesselName: string;
  // 8. 航次号
  voyageNo: string;
  // 9. 提单号
  billNo: string;
  // 10. 贸易国别
  tradeCountry: string;
  // 11. 装货港
  portOfLoading: string;
  // 12. 卸货港
  portOfDischarge: string;
  // 13. 进境口岸
  portOfEntry: string;
  // 14. 运抵国
  destinationCountry: string;
  // 15. 贸易方式
  tradeMode: string;
  // 16. 征免性质
  taxMode: string;
  // 17. 征免方式
  natureOfTax: string;
  // 18. 毛重（KG）
  grossWeight: number;
  // 19. 净重（KG）
  netWeight: number;
  // 20. 件数
  packageCount: number;
  // 21. 包装种类
  packageType: string;
  // 22. 集装箱号
  containerNo: string;
  // 23. 币制
  tradeCurrency: string;
  // 24. 总价
  totalPrice: number;
  // 25. 发票号
  invoiceNo: string;
  // 26. 发票日期
  invoiceDate: string;
  // 27. 合同号
  contractNo: string;
  // 28. 备注
  notes: string;

  // ============================================================
  // 代理报关委托书信息（可选）
  // ============================================================

  /** 代理报关委托书信息（仅代理报关时需要） */
  delegationInfo?: DelegationInfo;
}

// ============================================================
// 报关单表体字段定义（13个商品字段）
// ============================================================

export interface DeclarationItem {
  // 1. 项号
  itemNo: number;
  // 2. 商品名称
  goodsName: string;
  // 3. 规格型号
  specs: string;
  // 4. HS编码
  hsCode: string;
  // 5. 数量
  quantity: number;
  // 6. 单位
  unit: string;
  // 7. 单价
  unitPrice: number;
  // 8. 总价
  totalPrice: number;
  // 9. 币制
  currency: string;
  // 10. 原产国
  countryOfOrigin: string;
  // 11. 税率(%)
  dutyRate: number;
  // 12. 增值税率(%)
  vatRate: number;
  // 13. 备注
  notes: string;
}

// ============================================================
// AI 提取相关类型
// ============================================================

export interface ExtractedValue {
  value: string | number;
  confidence: number; // 0-1
  source: string; // 数据来源文件
}

export interface ExtractedDeclaration {
  header: Record<string, ExtractedValue>;
  items: Array<Record<string, ExtractedValue>>;
  overallConfidence: number;
}

// ============================================================
// UI 相关类型
// ============================================================

export interface MaterialRequirement {
  type: string;
  required: boolean;
  uploaded?: boolean;
}

export interface FileUploadResult {
  success: boolean;
  material?: Material;
  error?: string;
}

export interface ExtractResult {
  success: boolean;
  declaration?: Declaration;
  extractedData?: ExtractedDeclaration;
  error?: string;
}

// ============================================================
// 兼容旧类型
// ============================================================

export interface DeclarationData {
  header: Partial<DeclarationHeader>;
  items: DeclarationItem[];
}


// ============================================================
// 电子代理报关委托书字段定义
// ============================================================

export interface DelegationInfo {
  // ============================================================
  // 委托方信息（锁定字段 - 系统自动填充）
  // ============================================================

  /** 委托方企业海关编码（10位） */
  clientCompanyCode: string;

  /** 委托方企业名称 */
  clientCompanyName: string;

  /** 委托方统一社会信用代码（18位） */
  clientCreditCode: string;

  /** 委托方法人代表授权签署人 */
  clientAuthorizedPerson: string;

  // ============================================================
  // 被委托方信息（锁定字段 - 系统自动填充）
  // ============================================================

  /** 被委托方企业海关编码（10位） */
  agentCompanyCode: string;

  /** 被委托方企业名称 */
  agentCompanyName: string;

  /** 被委托方统一社会信用代码（18位） */
  agentCreditCode: string;

  /** 被委托方法人代表授权签署人 */
  agentAuthorizedPerson: string;

  // ============================================================
  // 委托关系信息（可编辑字段）
  // ============================================================

  /** 委托关系有效期（月） */
  validityPeriod: '3' | '6' | '9' | '12';

  /** 委托方式：SINGLE=逐票, LONG_TERM=长期 */
  delegationMode: 'SINGLE' | 'LONG_TERM';

  /** 委托内容（多选数组）
   * 可选项：报关报检、制单、加工贸易备案、核销、征免税、外汇核销、其他
   */
  delegationContent: string[];

  /** 签订日期（YYYY-MM-DD） */
  signDate: string;

  /** 有效截止日期（YYYY-MM-DD） */
  validUntil: string;

  // ============================================================
  // 状态信息（系统字段 - 不可编辑）
  // ============================================================

  /** 委托书编号 */
  delegationNo?: string;

  /** 委托关系状态
   * INITIATED=发起, CONFIRMED=确认, REJECTED=拒绝, EXPIRED=过期作废, TERMINATED=终止
   */
  delegationStatus?: 'INITIATED' | 'CONFIRMED' | 'REJECTED' | 'EXPIRED' | 'TERMINATED';

  /** 委托协议份数 */
  agreementCount?: number;
}

/**
 * 委托内容选项常量
 */
export const DELEGATION_CONTENT_OPTIONS = [
  '报关报检',
  '制单',
  '加工贸易备案',
  '核销',
  '征免税',
  '外汇核销',
  '其他',
] as const;

/**
 * 委托关系有效期选项
 */
export const VALIDITY_PERIOD_OPTIONS = [
  { label: '3个月', value: '3' },
  { label: '6个月', value: '6' },
  { label: '9个月', value: '9' },
  { label: '12个月', value: '12' },
] as const;

/**
 * 委托方式选项
 */
export const DELEGATION_MODE_OPTIONS = [
  { label: '逐票', value: 'SINGLE' },
  { label: '长期', value: 'LONG_TERM' },
] as const;
