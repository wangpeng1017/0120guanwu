'use client';

import { useState } from 'react';
import { message } from 'antd';
import DeclarationTabs from '@/components/Declaration/DeclarationTabs';
import { Task } from '@/types';

function BondedZoneSecondOutPage() {
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
    businessCategory: 'BONDED_ZONE',
    businessType: 'BONDED_ZONE_SECOND_OUT_ZONE',
    bondedZoneType: 'BONDED_ZONE_SECOND_OUT_ZONE',
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
        <h1 className="text-2xl font-bold">综保区二线出仓</h1>
        <p className="text-gray-500">货物从综合保税区运往境内</p>
      </div>
      <DeclarationTabs
        task={currentTask}
        businessType="BONDED_ZONE_SECOND_OUT_ZONE"
        businessCategory="BONDED_ZONE"
        bondedZoneType="二线出仓"
        onTaskUpdated={handleUploadSuccess}
      />
    </div>
  );
}

export default BondedZoneSecondOutPage;
