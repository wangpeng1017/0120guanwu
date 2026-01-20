import { MaterialRequirement } from '@/types';

// 业务类型配置
export const BUSINESS_TYPES = {
  'import-first-normal': {
    name: '一线进口-码头清关',
    direction: 'import',
    level: 'first',
    mode: 'normal',
    description: '货物直接进境报关，适用于一般贸易进口',
  },
  'import-first-bonded': {
    name: '一线进口-入保税仓',
    direction: 'import',
    level: 'first',
    mode: 'normal',
    description: '货物进入保税仓库存储',
  },
  'import-second-normal': {
    name: '二线进口-一般贸易出仓',
    direction: 'import',
    level: 'second',
    mode: 'normal',
    description: '保税货物一般贸易进口出区',
  },
  'import-second-processing': {
    name: '二线进口-加工贸易出仓',
    direction: 'import',
    level: 'second',
    mode: 'processing',
    description: '保税货物加工贸易出区',
  },
  'export-first-normal': {
    name: '一线出口-码头清关',
    direction: 'export',
    level: 'first',
    mode: 'normal',
    description: '货物直接出境报关',
  },
  'export-first-bonded': {
    name: '一线出口-合捷出仓',
    direction: 'export',
    level: 'first',
    mode: 'normal',
    description: '保税仓库货物直接出口',
  },
  'export-second-normal': {
    name: '二线出口-一般贸易进仓',
    direction: 'export',
    level: 'second',
    mode: 'normal',
    description: '一般贸易货物出口入区',
  },
  'export-second-processing': {
    name: '二线出口-加工贸易进仓',
    direction: 'export',
    level: 'second',
    mode: 'processing',
    description: '加工贸易货物出口入区',
  },
  'transfer-out': {
    name: '转仓-转出',
    direction: 'transfer',
    level: 'second',
    mode: 'normal',
    description: '货物转出',
  },
  'transfer-in': {
    name: '转仓-转入',
    direction: 'transfer',
    level: 'second',
    mode: 'normal',
    description: '货物转入',
  },
} as const;

// 材料清单配置
export const MATERIAL_REQUIREMENTS: Record<string, MaterialRequirement[]> = {
  'import-first-normal': [
    { type: '提单', required: true },
    { type: '发票', required: true },
    { type: '装箱单', required: true },
    { type: '合同', required: true },
    { type: '原产地证', required: false },
    { type: '保险单', required: false },
    { type: '3C证书', required: false },
  ],
  'import-first-bonded': [
    { type: '提单', required: true },
    { type: '发票', required: true },
    { type: '装箱单', required: true },
    { type: '入库单', required: true },
    { type: '原产地证', required: false },
  ],
  'import-second-normal': [
    { type: '出境备案清单', required: true },
    { type: '发票', required: true },
    { type: '装箱单', required: true },
    { type: '合同', required: false },
    { type: '许可证', required: false },
  ],
  'import-second-processing': [
    { type: '核注清单', required: true },
    { type: '手册', required: true },
    { type: '发票', required: true },
    { type: '装箱单', required: true },
    { type: '加工贸易合同', required: false },
  ],
  'export-first-normal': [
    { type: '报关单', required: true },
    { type: '发票', required: true },
    { type: '装箱单', required: true },
    { type: '合同', required: true },
    { type: '许可证', required: false },
    { type: '检验检疫证书', required: false },
  ],
  'export-first-bonded': [
    { type: '出境备案清单', required: true },
    { type: '发票', required: true },
    { type: '装箱单', required: true },
  ],
  'export-second-normal': [
    { type: '进境备案清单', required: true },
    { type: '发票', required: true },
    { type: '装箱单', required: true },
    { type: '合同', required: false },
    { type: '出口退税联', required: false },
  ],
  'export-second-processing': [
    { type: '核注清单', required: true },
    { type: '手册', required: true },
    { type: '发票', required: true },
    { type: '装箱单', required: true },
    { type: '加工贸易合同', required: false },
  ],
  'transfer-out': [
    { type: '转仓单', required: true },
    { type: '发票', required: true },
    { type: '出口核注清单', required: true },
  ],
  'transfer-in': [
    { type: '转仓单', required: true },
    { type: '发票', required: true },
    { type: '进口保税核注清单', required: true },
  ],
};

// 导航菜单配置
export const MENU_ITEMS = [
  { key: '/', icon: 'HomeOutlined', label: '首页' },
  { key: '/import', icon: 'DownloadOutlined', label: '进口申报' },
  { key: '/export', icon: 'UploadOutlined', label: '出口申报' },
  { key: '/transfer', icon: 'SwapOutlined', label: '转仓申报' },
  { key: '/tasks', icon: 'UnorderedListOutlined', label: '任务管理' },
  { key: '/history', icon: 'HistoryOutlined', label: '历史记录' },
];

// 文件类型映射
export const FILE_TYPE_MAP: Record<string, string> = {
  'bill_of_lading': '提单',
  'commercial_invoice': '发票',
  'packing_list': '装箱单',
  'contract': '合同',
  'certificate_of_origin': '原产地证',
  'insurance': '保险单',
  'ccc_certificate': '3C证书',
  'warehouse_receipt': '入库单',
  'exit_record': '出境备案清单',
  'license': '许可证',
  'verification_list': '核注清单',
  'handbook': '手册',
  'processing_contract': '加工贸易合同',
  'customs_declaration': '报关单',
  'entry_record': '进境备案清单',
  'export_tax_refund': '出口退税联',
  'transfer_order': '转仓单',
  'export_verification_list': '出口核注清单',
  'import_verification_list': '进口保税核注清单',
  'inspection_certificate': '检验检疫证书',
};

// 支持的文件类型
export const ACCEPTED_FILE_TYPES = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
  '.jpg',
  '.jpeg',
  '.png',
  '.tiff',
  '.zip',
  '.rar',
];

// 文件大小限制 (50MB)
export const MAX_FILE_SIZE = 50 * 1024 * 1024;
