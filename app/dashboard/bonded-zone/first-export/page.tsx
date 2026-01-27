'use client';

import DeclarationTabs from '@/components/Declaration/DeclarationTabs';
import { Task } from '@/types';

export default function BondedZoneFirstExportPage() {
  const defaultTask: Task = {
    id: 'demo',
    taskNo: 'DEMO-001',
    businessCategory: 'BONDED_ZONE',
    businessType: 'BONDED_ZONE_FIRST_EXPORT',
    bondedZoneType: 'BONDED_ZONE_FIRST_EXPORT',
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
        <h1 className="text-2xl font-bold">综保区一线出口</h1>
        <p className="text-gray-500">货物从综合保税区运往境外</p>
      </div>

      <DeclarationTabs
        task={defaultTask}
        businessType="BONDED_ZONE_FIRST_EXPORT"
        bondedZoneType="一线出口"
      />
    </div>
  );
}
