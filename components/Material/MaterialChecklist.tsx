'use client';

import { Card, Checkbox, Progress, Space } from 'antd';
import { getRequiredMaterials } from '@/lib/material-config';
import { Material } from '@/types';

interface MaterialChecklistProps {
  businessType: string; // 业务类型代码，如：BONDED_ZONE_FIRST_IMPORT
  uploadedMaterials: Material[]; // 已上传的材料列表
}

export function MaterialChecklist({
  businessType,
  uploadedMaterials = [],
}: MaterialChecklistProps) {
  // 加载必备单据配置
  const config = getRequiredMaterials(businessType);

  // 统计每个类型的上传数量
  const uploadedCountByType = uploadedMaterials.reduce((acc, m) => {
    const type = m.materialType;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 检查某个材料类型是否已上传完成
  const isUploadedComplete = (type: string, minCount: number = 1) => {
    const uploaded = uploadedCountByType[type] || 0;
    return uploaded >= minCount;
  };

  // 获取某个类型的上传数量
  const getUploadedCount = (type: string) => {
    return uploadedCountByType[type] || 0;
  };

  // 合并必填和可选材料
  const allMaterials = [
    ...config.required.map(item => ({
      ...item,
      required: true,
      uploadedCount: getUploadedCount(item.type),
      isComplete: isUploadedComplete(item.type, item.minCount || 1),
    })),
    ...config.optional.map(item => ({
      ...item,
      required: false,
      uploadedCount: getUploadedCount(item.type),
      isComplete: false, // 可选材料不需要标记完成
    })),
  ];

  const requiredMaterials = allMaterials.filter(m => m.required);
  const requiredCount = requiredMaterials.length;
  const uploadedCount = requiredMaterials.filter(m => m.isComplete).length;
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
        <Progress percent={Math.round(progress)} strokeColor="#1890ff" />

        <div className="space-y-3">
          {allMaterials.map((item, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-3 rounded-lg ${
                item.required ? 'bg-orange-50' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Checkbox checked={item.isComplete}>
                  <span className={item.required ? 'font-medium' : ''}>
                    {item.name}
                  </span>
                </Checkbox>
                {item.required && (
                  <span className="text-xs text-orange-500">
                    必填{item.minCount && item.minCount > 1 ? ` (${item.minCount}份)` : ''}
                  </span>
                )}
                {item.isComplete && (
                  <span className="text-xs text-green-500">✓</span>
                )}
              </div>
              <div className="text-sm text-gray-500">
                {item.isComplete ? (
                  <span className="text-green-500">
                    已上传 {item.uploadedCount}/{item.minCount || 1}
                  </span>
                ) : (
                  <span className="text-gray-400">
                    {item.required ? `待上传 (${item.uploadedCount}/${item.minCount || 1})` : `可选 (${item.uploadedCount}份)`}
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
  uploadedMaterials?: Material[];
}) {
  const config = getRequiredMaterials(businessType);

  // 统计每个类型的上传数量
  const uploadedCountByType = uploadedMaterials.reduce((acc, m) => {
    const type = m.materialType;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-2">
      <div className="font-medium text-sm">必备单据</div>
      {config.required.map((item, index) => {
        const uploaded = uploadedCountByType[item.type] || 0;
        const minCount = item.minCount || 1;
        const isComplete = uploaded >= minCount;

        return (
          <div
            key={index}
            className={`flex items-center justify-between p-2 rounded ${
              isComplete ? 'bg-green-50' : 'bg-red-50'
            }`}
          >
            <span className="text-sm">{item.name}</span>
            <span className={`text-xs ${isComplete ? 'text-green-600' : 'text-red-600'}`}>
              {uploaded}/{minCount}
            </span>
          </div>
        );
      })}

      {config.optional.length > 0 && (
        <>
          <div className="font-medium text-sm mt-4">可选单据</div>
          {config.optional.map((item, index) => {
            const uploaded = uploadedCountByType[item.type] || 0;

            return (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded bg-gray-50"
              >
                <span className="text-sm">{item.name}</span>
                <span className="text-xs text-gray-500">{uploaded}份</span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
