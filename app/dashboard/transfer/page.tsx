'use client';

import { Card } from 'antd';
import { BusinessTypeSelector } from '@/components/Task/BusinessTypeSelector';

export default function TransferPage() {
  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold">转仓申报</h1>
        <p className="text-gray-500">选择转仓类型，开始转仓申报流程</p>
      </div>

      <Card>
        <BusinessTypeSelector direction="transfer" />
      </Card>
    </div>
  );
}
