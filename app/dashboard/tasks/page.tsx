'use client';

import { Card, Table, Tag, Button, Space, Input, Select } from 'antd';
import { EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTaskStore } from '@/lib/store';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useState } from 'react';
import { BusinessDirection, TaskStatus } from '@/types';

export default function TasksPage() {
  const { tasks, deleteTask } = useTaskStore();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [directionFilter, setDirectionFilter] = useState<BusinessDirection | 'all'>('all');

  const statusMap = {
    pending: { text: '待处理', color: 'orange' },
    processing: { text: '处理中', color: 'blue' },
    completed: { text: '已完成', color: 'green' },
  };

  // 过滤任务
  const filteredTasks = tasks.filter((task) => {
    const matchSearch =
      task.taskNo.toLowerCase().includes(searchText.toLowerCase()) ||
      task.businessName.toLowerCase().includes(searchText.toLowerCase()) ||
      task.preEntryNo.toLowerCase().includes(searchText.toLowerCase());

    const matchStatus = statusFilter === 'all' || task.status === statusFilter;

    const matchDirection =
      directionFilter === 'all' ||
      (directionFilter === 'import' && task.businessType.startsWith('import')) ||
      (directionFilter === 'export' && task.businessType.startsWith('export')) ||
      (directionFilter === 'transfer' && task.businessType.startsWith('transfer'));

    return matchSearch && matchStatus && matchDirection;
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
    },
    {
      title: '业务类型',
      dataIndex: 'businessName',
      key: 'businessName',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: TaskStatus) => (
        <Tag color={statusMap[status].color}>{statusMap[status].text}</Tag>
      ),
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
      <div>
        <h1 className="text-2xl font-bold">任务管理</h1>
        <p className="text-gray-500">查看和管理所有申报任务</p>
      </div>

      <Card>
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
              { label: '待处理', value: 'pending' },
              { label: '处理中', value: 'processing' },
              { label: '已完成', value: 'completed' },
            ]}
          />
          <Select
            value={directionFilter}
            onChange={setDirectionFilter}
            style={{ width: 120 }}
            options={[
              { label: '全部业务', value: 'all' },
              { label: '进口', value: 'import' },
              { label: '出口', value: 'export' },
              { label: '转仓', value: 'transfer' },
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
      </Card>
    </div>
  );
}
