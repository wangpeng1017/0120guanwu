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
  businessCategory: 'BONDED_ZONE' | 'PORT';
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
