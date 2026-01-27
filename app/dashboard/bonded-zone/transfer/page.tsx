'use client';

import DeclarationTabs from '@/components/Declaration/DeclarationTabs';
import { Task } from '@/types';

export default function BondedZoneTransferPage() {
  const defaultTask: Task = {
    id: 'demo',
    taskNo: 'DEMO-001',
    businessCategory: 'BONDED_ZONE',
    businessType: 'BONDED_ZONE_TRANSFER',
    bondedZoneType: 'BONDED_ZONE_TRANSFER',
    portType: null,
    status: 'DRAFT',
    preEntryNo: null,
    customsNo: null,
    materials: [],
    declarations: [],
    generatedFiles: [],
    operationLogs: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold">综保区区内流转</h1>
        <p className="text-gray-500">综合保税区内企业之间货物流转</p>
      </div>

      <DeclarationTabs
        task={defaultTask}
        businessType="BONDED_ZONE_TRANSFER"
        bondedZoneType="区内流转"
      />
    </div>
  );
}
