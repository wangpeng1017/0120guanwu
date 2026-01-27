'use client';

import DeclarationTabs from '@/components/Declaration/DeclarationTabs';
import { Task } from '@/types';

export default function BondedZoneSecondInPage() {
  const defaultTask: Task = {
    id: 'demo',
    taskNo: 'DEMO-001',
    businessCategory: 'BONDED_ZONE',
    businessType: 'BONDED_ZONE_SECOND_IN_ZONE',
    bondedZoneType: 'BONDED_ZONE_SECOND_IN_ZONE',
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
        <h1 className="text-2xl font-bold">综保区二线进仓</h1>
        <p className="text-gray-500">货物从境内进入综合保税区</p>
      </div>

      <DeclarationTabs
        task={defaultTask}
        businessType="BONDED_ZONE_SECOND_IN_ZONE"
        bondedZoneType="二线进仓"
      />
    </div>
  );
}
