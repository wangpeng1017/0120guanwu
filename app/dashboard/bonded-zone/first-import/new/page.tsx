'use client';

import { useState } from 'react';
import { Button, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import DeclarationTabs from '@/components/Declaration/DeclarationTabs';
import { Task } from '@/types';

export default function NewFirstImportPage() {
  const router = useRouter();
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

  // 默认任务对象（首次上传前使用）
  const defaultTask: Task = {
    id: 'pending',
    taskNo: '待创建',
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

  // 使用实际任务或默认任务
  const currentTask = task || defaultTask;

  return (
    <div className="space-y-6 fade-in">
      {/* 头部区域 */}
      <div className="flex items-center gap-4">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push('/dashboard/bonded-zone/first-import')}
        >
          返回列表
        </Button>
        <div>
          <h1 className="text-2xl font-bold">新建一线进仓任务</h1>
          <p className="text-gray-500">综保区一线进仓 - 货物从境外进入综合保税区</p>
        </div>
      </div>

      <DeclarationTabs
        task={currentTask}
        businessType="BONDED_ZONE_FIRST_IMPORT"
        businessCategory="BONDED_ZONE"
        bondedZoneType="一线进仓"
        onTaskUpdated={handleUploadSuccess}
      />
    </div>
  );
}
