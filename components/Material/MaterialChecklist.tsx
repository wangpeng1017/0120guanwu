'use client';

import { Card, Checkbox, Progress, Space } from 'antd';
import { MATERIAL_REQUIREMENTS } from '@/lib/constants';
import { BusinessDirection, SupervisionLevel, TradeMode } from '@/types';

interface MaterialChecklistProps {
  businessDirection: BusinessDirection;
  supervisionLevel: SupervisionLevel;
  tradeMode: TradeMode;
}

// 构建材料清单的 key
function buildMaterialKey(
  businessDirection: BusinessDirection,
  supervisionLevel: SupervisionLevel,
  tradeMode: TradeMode
): string {
  const direction = businessDirection === 'IMPORT' ? 'import' : businessDirection === 'EXPORT' ? 'export' : 'transfer';
  const level = supervisionLevel === 'FIRST' ? 'first' : 'second';
  const mode = tradeMode === 'GENERAL' ? 'normal' : tradeMode === 'PROCESSING' ? 'processing' : 'normal';

  if (direction === 'transfer') {
    return level === 'first' ? 'transfer-out' : 'transfer-in';
  }
  return `${direction}-${level}-${mode}`;
}

export function MaterialChecklist({ businessDirection, supervisionLevel, tradeMode }: MaterialChecklistProps) {
  const materialKey = buildMaterialKey(businessDirection, supervisionLevel, tradeMode);
  const requirements = MATERIAL_REQUIREMENTS[materialKey] || [];

  const requiredCount = requirements.filter((r) => r.required).length;
  const uploadedCount = requirements.filter((r) => r.uploaded).length;
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
          {requirements.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Checkbox checked={item.uploaded} disabled={!item.uploaded}>
                  <span className={item.required ? 'font-medium' : ''}>
                    {item.type}
                  </span>
                </Checkbox>
                {item.required && (
                  <span className="text-xs text-orange-500">必填</span>
                )}
              </div>
              <div className="text-sm text-gray-500">
                {item.uploaded ? (
                  <span className="text-green-500">已上传</span>
                ) : (
                  <span className="text-gray-400">待上传</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Space>
    </Card>
  );
}
