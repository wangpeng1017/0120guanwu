'use client';

import { Card, Checkbox, Progress, Space } from 'antd';
import { MATERIAL_REQUIREMENTS } from '@/lib/constants';

interface MaterialChecklistProps {
  businessType: string;
}

export function MaterialChecklist({ businessType }: MaterialChecklistProps) {
  const requirements = MATERIAL_REQUIREMENTS[businessType] || [];

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
