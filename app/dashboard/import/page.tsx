'use client';

import { useState } from 'react';
import { message } from 'antd';
import DeclarationTabs from '@/components/Declaration/DeclarationTabs';
import { Task } from '@/types';

function GeneralImportPage() {
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
    businessCategory: 'GENERAL',
    businessType: 'GENERAL_IMPORT',
    bondedZoneType: null,
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

  const currentTask = task || defaultTask;

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold">一般进口</h1>
        <p className="text-gray-500">一般贸易进口</p>
      </div>
      <DeclarationTabs
        task={currentTask}
        businessType="GENERAL_IMPORT"
        businessCategory="GENERAL"
        onTaskUpdated={handleUploadSuccess}
      />
    </div>
  );
}

export default GeneralImportPage;
