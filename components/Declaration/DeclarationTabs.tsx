'use client';

import { Tabs } from 'antd';
import { UploadOutlined, EditOutlined, DownloadOutlined } from '@ant-design/icons';
import { MaterialChecklist } from '@/components/Material/MaterialChecklist';
import { MaterialUpload } from '@/components/Material/MaterialUpload';
import { DeclarationForm } from '@/components/Declaration/DeclarationForm';
import { DownloadPanel } from '@/components/Declaration/DownloadPanel';
import { Task } from '@/types';

interface DeclarationTabsProps {
  task: Task;
  businessType: string;
  businessCategory: string; // 新增
  bondedZoneType?: string;
  portType?: string;
  onTaskUpdated?: (taskId: string) => void;
}

export default function DeclarationTabs({
  task,
  businessType,
  businessCategory,
  bondedZoneType,
  portType,
  onTaskUpdated,
}: DeclarationTabsProps) {
  return (
    <Tabs
      defaultActiveKey="materials"
      items={[
        {
          key: 'materials',
          label: (
            <>
              <UploadOutlined />
              <span className="ml-2">材料上传</span>
            </>
          ),
          children: (
            <div className="max-w-4xl mx-auto space-y-6">
              <MaterialChecklist
                businessType={businessType}
                uploadedMaterials={task.materials}
              />
              <MaterialUpload
                taskId={task.id}
                businessCategory={businessCategory}
                businessType={businessType}
                onUploadSuccess={(taskId) => {
                  if (onTaskUpdated) {
                    onTaskUpdated(taskId);
                  }
                }}
              />
            </div>
          ),
        },
        {
          key: 'declaration',
          label: (
            <>
              <EditOutlined />
              <span className="ml-2">申报要素</span>
            </>
          ),
          children: (
            <div className="max-w-7xl mx-auto">
              <DeclarationForm task={task} onTaskUpdated={onTaskUpdated} />
            </div>
          ),
        },
        {
          key: 'download',
          label: (
            <>
              <DownloadOutlined />
              <span className="ml-2">下载</span>
            </>
          ),
          children: (
            <div className="max-w-4xl mx-auto">
              <DownloadPanel taskId={task.id} />
            </div>
          ),
        },
      ]}
    />
  );
}
