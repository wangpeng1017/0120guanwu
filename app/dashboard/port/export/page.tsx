'use client';

import { Card } from 'antd';
import { MaterialChecklist } from '@/components/Material/MaterialChecklist';
import { MaterialUpload } from '@/components/Material/MaterialUpload';
import { DeclarationForm } from '@/components/Declaration/DeclarationForm';
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <MaterialChecklist businessType="PORT_EXPORT" />
          <MaterialUpload taskId="demo" />
        </div>

        <div>
          <DeclarationForm task={defaultTask} />
        </div>
      </div>
    </div>
  );
}
