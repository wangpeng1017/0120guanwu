'use client';

import { Card } from 'antd';
import { BusinessTypeSelector } from '@/components/Task/BusinessTypeSelector';

export default function ImportPage() {
  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold">进口申报</h1>
        <p className="text-gray-500">选择业务类型，开始进口报关申报流程</p>
      </div>

      <Card>
        <BusinessTypeSelector direction="import" />
      </Card>
    </div>
  );
}
