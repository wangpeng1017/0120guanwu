'use client';

import DeclarationTabs from '@/components/Declaration/DeclarationTabs';
import { Task } from '@/types';

export default function PortImportPage() {
  const defaultTask: Task = {
    id: 'demo',
    taskNo: 'DEMO-001',
    businessCategory: 'PORT',
    businessType: 'PORT_IMPORT',
    bondedZoneType: null,
    portType: 'PORT_IMPORT',
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
        <h1 className="text-2xl font-bold">口岸进口</h1>
        <p className="text-gray-500">货物从境外进口到口岸</p>
      </div>

      <DeclarationTabs
        task={defaultTask}
        businessType="PORT_IMPORT"
        portType="进口"
      />
    </div>
  );
}
