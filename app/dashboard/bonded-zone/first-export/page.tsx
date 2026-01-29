'use client';

import { useState } from 'react';
import { message } from 'antd';
import DeclarationTabs from '@/components/Declaration/DeclarationTabs';
import { Task } from '@/types';

export default function BondedZoneFirstExportPage() {
  const [task, setTask] = useState<Task | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);

  // 上传成功回调
  const handleUploadSuccess = (newTaskId: string) => {
    console.log('[页面] 文件上传成功，任务ID:', newTaskId);
    setTaskId(newTaskId);
    message.success('文件上传成功');
    // 刷新任务数据
    fetchTaskData(newTaskId);
  };

  // 获取任务数据
  const fetchTaskData = async (tid: string) => {
    try {
      const response = await fetch(`/api/tasks/${tid}`);
      const data = await response.json();

      if (data.success) {
        setTask(data.data);
        console.log('[页面] 任务数据已更新:', {
          materials: data.data.materials.length,
          types: data.data.materials.map((m: any) => m.materialType),
        });
      }
    } catch (error) {
      console.error('[页面] 加载任务异常:', error);
    }
  };

  // 默认任务对象（首次上传前使用）
  const defaultTask: Task = {
    id: 'pending',
    taskNo: '待创建',
    businessCategory: 'BONDED_ZONE',
    businessType: 'BONDED_ZONE_FIRST_EXPORT',
    bondedZoneType: 'BONDED_ZONE_FIRST_EXPORT',
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

  // 使用实际任务或默认任务
  const currentTask = task || defaultTask;

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold">综保区一线出口</h1>
        <p className="text-gray-500">货物从综合保税区运往境外</p>
      </div>

      <DeclarationTabs
        task={currentTask}
        businessType="BONDED_ZONE_FIRST_EXPORT"
        businessCategory="BONDED_ZONE"
        bondedZoneType="一线出口"
        onTaskUpdated={handleUploadSuccess}
      />
    </div>
  );
}
