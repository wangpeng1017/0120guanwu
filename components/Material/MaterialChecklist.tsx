'use client';

import { Card, Checkbox, Progress, Space } from 'antd';
import { MaterialType } from '@/types/enums';

interface MaterialItem {
  type: MaterialType;
  name: string;
  minCount?: number;
  required: boolean;
  uploaded?: boolean;
}

interface MaterialChecklistProps {
  businessType: string; // 业务类型代码，如：BONDED_ZONE_FIRST_IMPORT
  materials?: MaterialItem[];
  onMaterialChange?: (type: MaterialType) => void;
}

/**
 * 从配置文件加载必备单据清单
 * 注意：实际使用时应该从 API 或配置文件中读取
 */
function loadRequiredMaterials(businessType: string): {
  required: Array<{ type: string; name: string; minCount: number }>;
  optional: Array<{ type: string; name: string }>;
} {
  // 临时实现：从 JSON 配置文件导入
  // 实际使用时可以通过 API 获取
  try {
    // 这里应该导入配置文件
    // const REQUIRED_MATERIALS = require('@/docs/field-mappings/required-materials.json');
    // return REQUIRED_MATERIALS.businessTypes[businessType] || { required: [], optional: [] };

    // 临时返回默认配置
    return { required: [], optional: [] };
  } catch (error) {
    console.error('[MaterialChecklist] 加载配置失败:', error);
    return { required: [], optional: [] };
  }
}

/**
 * 材料类型映射（MaterialType -> 中文名称）
 */
const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  [MaterialType.BILL_OF_LADING]: '提单',
  [MaterialType.COMMERCIAL_INVOICE]: '商业发票',
  [MaterialType.PACKING_LIST]: '装箱单',
  [MaterialType.CONTRACT]: '合同',
  [MaterialType.CUSTOMS_DECLARATION]: '报关单',
  [MaterialType.BONDED_NOTE]: '核注清单',
  [MaterialType.CERTIFICATE]: '原产地证',
  [MaterialType.OTHER]: '其他',
};

export function MaterialChecklist({
  businessType,
  materials = [],
  onMaterialChange,
}: MaterialChecklistProps) {
  // 加载必备单据配置
  const config = loadRequiredMaterials(businessType);

  // 合并配置和已上传材料
  const allMaterials: MaterialItem[] = [
    ...config.required.map(item => ({
      type: item.type as MaterialType,
      name: item.name,
      minCount: item.minCount,
      required: true,
      uploaded: materials.some(m => m.type === item.type && m.uploaded),
    })),
    ...config.optional.map(item => ({
      type: item.type as MaterialType,
      name: item.name,
      required: false,
      uploaded: materials.some(m => m.type === item.type && m.uploaded),
    })),
  ];

  const requiredMaterials = allMaterials.filter(m => m.required);
  const requiredCount = requiredMaterials.length;
  const uploadedCount = requiredMaterials.filter(m => m.uploaded).length;
  const progress = requiredCount > 0 ? (uploadedCount / requiredCount) * 100 : 0;

  return (
    <Card
      title={
        <div className="flex justify-between items-center">
          <span>材料清单</span>
          <span className="text-sm text-gray-500">
            {uploadedCount}/{requiredCount} 必填材料
          </span>
        </div>
      }
    >
      <Space direction="vertical" size="middle" className="w-full">
        <Progress percent={progress} strokeColor="#1890ff" />

        <div className="space-y-3">
          {allMaterials.map((item, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-3 rounded-lg ${
                item.required ? 'bg-orange-50' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={item.uploaded}
                  onChange={() => onMaterialChange?.(item.type)}
                >
                  <span className={item.required ? 'font-medium' : ''}>
                    {item.name}
                  </span>
                </Checkbox>
                {item.required && (
                  <span className="text-xs text-orange-500">
                    必填{item.minCount && item.minCount > 1 ? ` (${item.minCount}份)` : ''}
                  </span>
                )}
                {item.uploaded && (
                  <span className="text-xs text-green-500">✓</span>
                )}
              </div>
              <div className="text-sm text-gray-500">
                {item.uploaded ? (
                  <span className="text-green-500">已上传</span>
                ) : (
                  <span className="text-gray-400">
                    {item.required ? '待上传' : '可选'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Space>
    </Card>
  );
}

/**
 * 简化版材料清单组件（用于显示）
 */
export function MaterialChecklistSimple({
  businessType,
  uploadedMaterials = [],
}: {
  businessType: string;
  uploadedMaterials?: Array<{ type: MaterialType; fileName: string }>;
}) {
  const config = loadRequiredMaterials(businessType);

  return (
    <div className="space-y-2">
      <div className="font-medium text-sm">必备单据</div>
      {config.required.map((item, index) => {
        const uploaded = uploadedMaterials.filter(m => m.type === item.type);
        const isComplete = uploaded.length >= (item.minCount || 1);

        return (
          <div
            key={index}
            className={`flex items-center justify-between p-2 rounded ${
              isComplete ? 'bg-green-50' : 'bg-red-50'
            }`}
          >
            <span className="text-sm">{item.name}</span>
            <span className={`text-xs ${isComplete ? 'text-green-600' : 'text-red-600'}`}>
              {uploaded.length}/{item.minCount || 1}
            </span>
          </div>
        );
      })}

      {config.optional.length > 0 && (
        <>
          <div className="font-medium text-sm mt-4">可选单据</div>
          {config.optional.map((item, index) => {
            const uploaded = uploadedMaterials.filter(m => m.type === item.type);

            return (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded bg-gray-50"
              >
                <span className="text-sm">{item.name}</span>
                <span className="text-xs text-gray-500">{uploaded.length}份</span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
