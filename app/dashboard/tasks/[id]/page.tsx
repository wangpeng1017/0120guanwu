
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  Descriptions,
  Button,
  Tabs,
  Tag,
  Space,
  Empty,
  Spin,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  UploadOutlined,
  EditOutlined,
  FileTextOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useTaskStore } from '@/lib/store';
import { formatDate } from '@/lib/utils';
import { MaterialChecklist } from '@/components/Material/MaterialChecklist';
import { MaterialUpload } from '@/components/Material/MaterialUpload';
import { DeclarationForm } from '@/components/Declaration/DeclarationForm';
import { DownloadPanel } from '@/components/Declaration/DownloadPanel';
import { TASK_STATUS_LABELS, BUSINESS_DIRECTION_LABELS, SUPERVISION_LEVEL_LABELS, TRADE_MODE_LABELS } from '@/lib/constants';

// 获取业务类型名称
function getBusinessTypeName(task: any): string {
  const direction = BUSINESS_DIRECTION_LABELS[task.businessDirection] || task.businessDirection;
  const level = SUPERVISION_LEVEL_LABELS[task.supervisionLevel] || task.supervisionLevel;
  const mode = TRADE_MODE_LABELS[task.tradeMode] || task.tradeMode;
  return `${direction}-${level}-${mode}`;
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { tasks, setCurrentTask } = useTaskStore();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('materials');
  const [task, setTask] = useState<any | null>(null);

  useEffect(() => {
    const fetchTask = async () => {
      const taskId = params.id as string;
      if (!taskId) return;

      // 先从本地 store 查找
      const localTask = tasks.find((t) => t.id === taskId);
      if (localTask) {
        setTask(localTask);
        setCurrentTask(localTask);
        setLoading(false);
        return;
      }

      // 本地没有，从 API 获取
      try {
        const response = await fetch(`/api/tasks/${taskId}`);
        if (!response.ok) {
          throw new Error('获取任务失败');
        }
        const result = await response.json();
        if (result.success && result.task) {
          setTask(result.task);
          setCurrentTask(result.task);
        } else {
          message.error(result.error || '任务不存在');
        }
      } catch (error) {
        console.error('获取任务失败:', error);
        message.error('获取任务失败，请重试');
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [params.id, tasks, setCurrentTask]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (!task) {
    return (
      <div>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push('/dashboard/tasks')}
          className="mb-4"
        >
          返回任务列表
        </Button>
        <Card>
          <Empty description="任务不存在" />
        </Card>
      </div>
    );
  }

  const statusInfo = TASK_STATUS_LABELS[task.status] || { text: task.status, color: 'default' };
  const businessName = getBusinessTypeName(task);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  return (
    <div className="space-y-6 fade-in">
      {/* 头部操作栏 */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push('/dashboard/tasks')}
          >
            返回
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{businessName}</h1>
            <p className="text-gray-500 text-sm">
              任务编号: {task.taskNo} | 预录入编号: {task.preEntryNo || '待生成'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Tag color={statusInfo.color} className="text-sm px-3 py-1">
            {statusInfo.text}
          </Tag>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => setActiveTab('download')}
          >
            下载文件
          </Button>
        </div>
      </div>

      {/* 任务基本信息 */}
      <Card title="任务信息">
        <Descriptions column={3} bordered>
          <Descriptions.Item label="任务编号">{task.taskNo}</Descriptions.Item>
          <Descriptions.Item label="预录入编号">{task.preEntryNo || '待生成'}</Descriptions.Item>
          <Descriptions.Item label="业务类型">{businessName}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">{formatDate(task.createdAt)}</Descriptions.Item>
          <Descriptions.Item label="更新时间">{formatDate(task.updatedAt)}</Descriptions.Item>
          <Descriptions.Item label="材料数量" span={3}>
            {task.materials?.length || 0} 个文件
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 功能标签页 */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={[
            {
              key: 'materials',
              label: (
                <span>
                  <UploadOutlined />
                  材料上传
                </span>
              ),
              children: (
                <div className="space-y-6">
                  <MaterialChecklist businessType={task.businessType || 'BONDED_ZONE_FIRST_IMPORT'} />
                  <MaterialUpload taskId={task.id} />
                </div>
              ),
            },
            {
              key: 'declaration',
              label: (
                <span>
                  <EditOutlined />
                  申报要素
                </span>
              ),
              children: (
                <DeclarationForm task={task} />
              ),
            },
            {
              key: 'download',
              label: (
                <span>
                  <DownloadOutlined />
                  下载
                </span>
              ),
              children: (
                <DownloadPanel taskId={task.id} />
              ),
            },
            {
              key: 'preview',
              label: (
                <span>
                  <FileTextOutlined />
                  预览
                </span>
              ),
              children: (
                <div className="text-center py-12">
                  <Empty description="生成申报表格后可预览" />
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
