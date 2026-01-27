'use client';

import DeclarationTabs from '@/components/Declaration/DeclarationTabs';
import { Task } from '@/types';

export default function PortExportPage() {
  const defaultTask: Task = {
    id: 'demo',
    taskNo: 'DEMO-001',
    businessCategory: 'PORT',
    businessType: 'PORT_EXPORT',
    bondedZoneType: null,
    portType: 'PORT_EXPORT',
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
        <h1 className="text-2xl font-bold">口岸出口</h1>
        <p className="text-gray-500">货物从口岸出口到境外</p>
      </div>

      <DeclarationTabs
        task={defaultTask}
        businessType="PORT_EXPORT"
        portType="出口"
      />
    </div>
  );
}
