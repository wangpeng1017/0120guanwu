'use client';

import { Card, Table, Tag, Button, Space, Input, Select, message, Spin } from 'antd';
import { EyeOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTaskStore } from '@/lib/store';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { TaskStatus } from '@/types';
import { TASK_STATUS_LABELS } from '@/lib/constants';

// 获取业务类型名称
function getBusinessTypeName(task: any): string {
  const categoryLabels: Record<string, string> = {
    'BONDED_ZONE': '综保区',
    'PORT': '口岸',
  };
  const category = categoryLabels[task.businessCategory] || task.businessCategory;
  return `${category}申报`;
}

export default function TasksPage() {
  const { tasks, deleteTask, setTasks } = useTaskStore();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // 获取任务列表
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/tasks');
        if (!response.ok) {
          throw new Error('获取任务列表失败');
        }
        const result = await response.json();
        if (result.success && result.data?.tasks) {
          setTasks(result.data.tasks);
        } else {
          message.error(result.error || '获取任务列表失败');
        }
      } catch (error) {
        console.error('获取任务列表失败:', error);
        message.error('获取任务列表失败，请重试');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [setTasks]);

  // 过滤任务
  const filteredTasks = tasks.filter((task) => {
    const businessName = getBusinessTypeName(task);
    const matchSearch =
      task.taskNo.toLowerCase().includes(searchText.toLowerCase()) ||
      businessName.toLowerCase().includes(searchText.toLowerCase()) ||
      (task.preEntryNo && task.preEntryNo.toLowerCase().includes(searchText.toLowerCase()));

    const matchStatus = statusFilter === 'all' || task.status === statusFilter;

    const matchCategory = categoryFilter === 'all' || task.businessCategory === categoryFilter;

    return matchSearch && matchStatus && matchCategory;
  });

  const columns = [
    {
      title: '任务编号',
      dataIndex: 'taskNo',
      key: 'taskNo',
      width: 180,
    },
    {
      title: '预录入编号',
      dataIndex: 'preEntryNo',
      key: 'preEntryNo',
      width: 180,
      render: (value: string | null) => value || '待生成',
    },
    {
      title: '业务类型',
      key: 'businessName',
      render: (_: any, record: any) => getBusinessTypeName(record),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: TaskStatus) => {
        const statusInfo = TASK_STATUS_LABELS[status] || { text: status, color: 'default' };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
    {
      title: '材料数量',
      key: 'materialCount',
      width: 100,
      render: (_: any, record: any) => record.materials?.length || 0,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: Date) => formatDate(date),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: any, record: any) => (
        <Space>
          <Link href={`/dashboard/tasks/${record.id}`}>
            <Button type="link" size="small" icon={<EyeOutlined />}>
              查看
            </Button>
          </Link>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => deleteTask(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6 fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">任务管理</h1>
          <p className="text-gray-500">查看和管理所有申报任务</p>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => window.location.reload()}
          loading={loading}
        >
          刷新
        </Button>
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Spin size="large" tip="加载任务列表..." />
          </div>
        ) : (
          <>
            {/* 筛选栏 */}
            <Space className="mb-4" size="middle">
              <Input
                placeholder="搜索任务编号、业务类型..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 250 }}
                allowClear
              />
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 120 }}
                options={[
                  { label: '全部状态', value: 'all' },
                  { label: '草稿', value: 'DRAFT' },
                  { label: '上传中', value: 'UPLOADING' },
                  { label: '提取中', value: 'EXTRACTING' },
                  { label: '编辑中', value: 'EDITING' },
                  { label: '生成中', value: 'GENERATING' },
                  { label: '已完成', value: 'COMPLETED' },
                  { label: '失败', value: 'FAILED' },
                ]}
              />
              <Select
                value={categoryFilter}
                onChange={setCategoryFilter}
                style={{ width: 120 }}
                options={[
                  { label: '全部类别', value: 'all' },
                  { label: '综保区', value: 'BONDED_ZONE' },
                  { label: '口岸', value: 'PORT' },
                ]}
              />
            </Space>

            <Table
              columns={columns}
              dataSource={filteredTasks}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条`,
              }}
            />
          </>
        )}
      </Card>
    </div>
  );
}
