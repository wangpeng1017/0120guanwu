/**
 * 材料配置工具函数
 * TDD: GREEN - 实现最小代码让测试通过
 */

import REQUIRED_MATERIALS from '@/docs/field-mappings/required-materials.json';

export interface MaterialRequirement {
  type: string;
  name: string;
  minCount?: number;
}

export interface BusinessTypeMaterials {
  required: MaterialRequirement[];
  optional: MaterialRequirement[];
}

/**
 * 获取指定业务类型的材料清单
 */
export function getRequiredMaterials(businessType: string): BusinessTypeMaterials {
  if (!businessType) {
    return { required: [], optional: [] };
  }

  return (REQUIRED_MATERIALS.businessTypes as Record<string, BusinessTypeMaterials>)[businessType] || {
    required: [],
    optional: []
  };
}

/**
 * 获取材料类型的中文名称
 */
export function getMaterialTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    BILL_OF_LADING: '提单',
    COMMERCIAL_INVOICE: '商业发票',
    PACKING_LIST: '装箱单',
    CONTRACT: '合同',
    CUSTOMS_DECLARATION: '报关单',
    BONDED_NOTE: '核注清单',
    CERTIFICATE: '原产地证',
    OTHER: '其他',
  };

  return labels[type] || type;
}
