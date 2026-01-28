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
  bondedZoneType?: string;
  portType?: string;
  onTaskUpdated?: () => void;
}

export default function DeclarationTabs({
  task,
  businessType,
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
              />
              <MaterialUpload
                taskId={task.id}
                onUploadSuccess={() => {
                  if (onTaskUpdated) {
                    onTaskUpdated();
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
              <DownloadPanel taskId={task.id} materials={task.materials} />
            </div>
          ),
        },
      ]}
    />
  );
}
