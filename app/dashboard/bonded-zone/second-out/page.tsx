'use client';

import DeclarationTabs from '@/components/Declaration/DeclarationTabs';
import { Task } from '@/types';

export default function BondedZoneSecondOutPage() {
  const defaultTask: Task = {
    id: 'demo',
    taskNo: 'DEMO-001',
    businessCategory: 'BONDED_ZONE',
    businessType: 'BONDED_ZONE_SECOND_OUT_GENERAL',
    bondedZoneType: 'BONDED_ZONE_SECOND_OUT_GENERAL',
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
        <h1 className="text-2xl font-bold">综保区二线出仓</h1>
        <p className="text-gray-500">货物从综合保税区运往境内</p>
      </div>

      <DeclarationTabs
        task={defaultTask}
        businessType="BONDED_ZONE_SECOND_OUT_GENERAL"
        bondedZoneType="二线出仓"
      />
    </div>
  );
}
