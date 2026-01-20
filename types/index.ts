// 业务类型
export type BusinessDirection = 'import' | 'export' | 'transfer';
export type SupervisionLevel = 'first' | 'second';
export type TradeMode = 'normal' | 'processing';

export interface BusinessType {
  direction: BusinessDirection;
  level: SupervisionLevel;
  mode: TradeMode;
}

// 任务状态
export type TaskStatus = 'pending' | 'processing' | 'completed';

// 任务
export interface Task {
  id: string;
  taskNo: string;
  preEntryNo: string;
  businessType: string;
  businessName: string;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
  materials: Material[];
  declarationData?: DeclarationData;
}

// 材料
export interface Material {
  id: string;
  taskId: string;
  fileType: string; // 提单、发票、装箱单等
  fileName: string;
  fileSize: number;
  fileUrl: string;
  uploadedAt: Date;
}

// 申报要素
export interface DeclarationData {
  header: {
    preEntryNo: string;
    customsNo: string;
    domesticConsignee: string;
    domesticConsigneeCode: string;
    overseasConsignee: string;
    declarant: string;
    declarantCode: string;
    transportMode: string;
    transportModeCode: string;
    vesselName: string;
    voyageNo: string;
    billNo: string;
    tradeMode: string;
    tradeModeCode: string;
    exemptionMode: string;
    exemptionModeCode: string;
    countryOfOrigin: string;
    countryCode: string;
    portOfLoading: string;
    portCode: string;
    transactionMode: string;
    freight: string;
    insurance: string;
    otherCharges: string;
    contractNo: string;
    packages: number;
    packageType: string;
    grossWeight: number;
    netWeight: number;
    containerNo: string;
    attachmentNo: string;
    marks: string;
  };
  items: DeclarationItem[];
}

export interface DeclarationItem {
  itemNo: number;
  goodsName: string;
  specs: string;
  quantity: number;
  unit: string;
  unitCode: string;
  countryOfOrigin: string;
  countryCode: string;
    unitPrice: number;
  totalPrice: number;
  currency: string;
  currencyCode: string;
  exemption: string;
  declarationElements: string;
}

// 材料清单项
export interface MaterialRequirement {
  type: string; // 提单、发票等
  required: boolean;
  uploaded?: boolean;
}
