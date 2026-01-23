/**
 * 全局类型定义
 * 用于补充 Prisma 生成的类型
 */

/**
 * 单据类型枚举
 */
export enum MaterialType {
  BILL_OF_LADING = 'BILL_OF_LADING',
  COMMERCIAL_INVOICE = 'COMMERCIAL_INVOICE',
  PACKING_LIST = 'PACKING_LIST',
  CONTRACT = 'CONTRACT',
  CUSTOMS_DECLARATION = 'CUSTOMS_DECLARATION',
  BONDED_NOTE = 'BONDED_NOTE',
  CERTIFICATE = 'CERTIFICATE',
  OTHER = 'OTHER',
}

/**
 * 业务类别枚举
 */
export enum BusinessCategory {
  BONDED_ZONE = 'BONDED_ZONE',
  PORT = 'PORT',
}

/**
 * 绑保区业务类型枚举
 */
export enum BondedZoneBusinessType {
  FIRST_IMPORT = 'FIRST_IMPORT',
  FIRST_EXPORT = 'FIRST_EXPORT',
  SECOND_IN = 'SECOND_IN',
  SECOND_OUT = 'SECOND_OUT',
  TRANSFER = 'TRANSFER',
}

/**
 * 口岸业务类型枚举
 */
export enum PortBusinessType {
  PORT_IMPORT = 'PORT_IMPORT',
  PORT_EXPORT = 'PORT_EXPORT',
}

/**
 * 任务状态枚举
 */
export enum TaskStatus {
  DRAFT = 'DRAFT',
  UPLOADING = 'UPLOADING',
  EXTRACTING = 'EXTRACTING',
  EDITING = 'EDITING',
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}
