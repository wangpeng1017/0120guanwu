'use client';

import { Card } from 'antd';
import { BusinessTypeSelector } from '@/components/Task/BusinessTypeSelector';

export default function ExportPage() {
  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold">出口申报</h1>
        <p className="text-gray-500">选择业务类型，开始出口报关申报流程</p>
      </div>

      <Card>
        <BusinessTypeSelector direction="export" />
      </Card>
    </div>
  );
}
