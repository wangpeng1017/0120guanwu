'use client';

import { Card } from 'antd';
import { MaterialChecklist } from '@/components/Material/MaterialChecklist';
import { MaterialUpload } from '@/components/Material/MaterialUpload';
import { DeclarationForm } from '@/components/Declaration/DeclarationForm';
import { Task } from '@/types';

export default function BondedZoneFirstImportPage() {
  // 默认任务对象
  const defaultTask: Task = {
    id: 'demo',
    taskNo: 'DEMO-001',
    businessCategory: 'BONDED_ZONE',
    businessType: 'BONDED_ZONE_FIRST_IMPORT',
    bondedZoneType: 'BONDED_ZONE_FIRST_IMPORT',
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
        <h1 className="text-2xl font-bold">综保区一线进口</h1>
        <p className="text-gray-500">货物从境外进入综合保税区</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：材料上传 */}
        <div className="space-y-6">
          <MaterialChecklist businessType="BONDED_ZONE_FIRST_IMPORT" />
          <MaterialUpload taskId="demo" />
        </div>

        {/* 右侧：申报要素编辑 */}
        <div>
          <DeclarationForm task={defaultTask} />
        </div>
      </div>
    </div>
  );
}
