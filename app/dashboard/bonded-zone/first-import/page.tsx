'use client';

import { useState, useEffect } from 'react';
import { Card, Spin, message } from 'antd';
import { MaterialChecklist } from '@/components/Material/MaterialChecklist';
import { MaterialUpload } from '@/components/Material/MaterialUpload';
import { DeclarationForm } from '@/components/Declaration/DeclarationForm';
import { Task } from '@/types';
import { MaterialType } from '@/types/enums';

export default function BondedZoneFirstImportPage() {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // 加载任务数据
  useEffect(() => {
    fetchTaskData();
  }, [refreshKey]);

  const fetchTaskData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tasks/demo');
      const data = await response.json();

      if (data.success) {
        setTask(data.data);
        console.log('[页面] 任务数据已更新:', {
          materials: data.data.materials.length,
          types: data.data.materials.map((m: any) => m.materialType),
        });
      } else {
        console.error('[���面] 加载任务失败:', data.error);
      }
    } catch (error) {
      console.error('[页面] 加载任务异常:', error);
    } finally {
      setLoading(false);
    }
  };

  // 上传成功回调
  const handleUploadSuccess = () => {
    console.log('[页面] 文件上传成功，刷新任务数据');
    setRefreshKey(prev => prev + 1);
    message.success('文件上传成功');
  };

  // 转换材料数据格式
  const materialsForChecklist = task?.materials.map(m => ({
    type: m.materialType as MaterialType,
    name: m.originalName,
    uploaded: true,
    required: false, // 从数据库加载的材料默认为非必填
  })) || [];

  // 默认任务对象（加载时使用）
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold">综保区一线进口</h1>
        <p className="text-gray-500">货物从境外进入综合保税区</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：材料上传 */}
        <div className="space-y-6">
          <MaterialChecklist
            businessType="BONDED_ZONE_FIRST_IMPORT"
            materials={materialsForChecklist}
          />
          <MaterialUpload
            taskId="demo"
            onUploadSuccess={handleUploadSuccess}
          />
        </div>

        {/* 右侧：申报要素编辑 */}
        <div>
          <DeclarationForm task={task || defaultTask} />
        </div>
      </div>
    </div>
  );
}
