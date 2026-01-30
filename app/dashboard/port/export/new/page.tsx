'use client';

import { useState } from 'react';
import { Button, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import DeclarationTabs from '@/components/Declaration/DeclarationTabs';
import { Task } from '@/types';

export default function NewPortExportPage() {
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);

  const handleUploadSuccess = (newTaskId: string) => {
    console.log('[页面] 文件上传成功，任务ID:', newTaskId);
    setTaskId(newTaskId);
    message.success('文件上传成功');
    fetchTaskData(newTaskId);
  };

  const fetchTaskData = async (tid: string) => {
    try {
      const response = await fetch(`/api/tasks/${tid}`);
      const data = await response.json();

      if (data.success) {
        setTask(data.task);
        console.log('[页面] 任务数据已更新:', {
          materials: data.task.materials.length,
          types: data.task.materials.map((m: any) => m.materialType),
        });
      }
    } catch (error) {
      console.error('[页面] 加载任务异常:', error);
    }
  };

  const defaultTask: Task = {
    id: 'pending',
    taskNo: '待创建',
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

  const currentTask = task || defaultTask;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center gap-4">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push('/dashboard/port/export')}
        >
          返回列表
        </Button>
        <div>
          <h1 className="text-2xl font-bold">新建口岸出口任务</h1>
          <p className="text-gray-500">口岸出口 - 货物出口到境外</p>
        </div>
      </div>

      <DeclarationTabs
        task={currentTask}
        businessType="PORT_EXPORT"
        businessCategory="PORT"
        portType="出口"
        onTaskUpdated={handleUploadSuccess}
      />
    </div>
  );
}
