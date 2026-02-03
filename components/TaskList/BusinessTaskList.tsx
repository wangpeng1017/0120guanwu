"use client";

import { Card, Table, Tag, Button, Space, Input, Select, message, Spin, DatePicker } from 'antd';
import { EditOutlined, DeleteOutlined, ReloadOutlined, PlusOutlined, ExportOutlined } from '@ant-design/icons';
import { useTaskStore } from '@/lib/store';
import { formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { TaskStatus } from '@/types';
import { TASK_STATUS_LABELS } from '@/lib/constants';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-config';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

interface BusinessTaskListProps {
  businessType: string;
  businessCategory: string;
  title: string;
  description: string;
  createUrl: string;
}

export function BusinessTaskList({
  businessType,
  businessCategory,
  title,
  description,
  createUrl
}: BusinessTaskListProps) {
  const router = useRouter();
  const { setTasks } = useTaskStore();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  // 使用 SWR 获取任务列表（带缓存）
  const { data, error, isLoading, mutate } = useSWR('/api/tasks', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000, // 10秒内相同请求去重
  });

  const tasks = data?.data?.tasks || [];

  // 当数据更新时同步到 store
  useState(() => {
    if (tasks.length > 0) {
      setTasks(tasks);
    }
  });

  const filteredTasks = tasks.filter((task: any) => {
    const matchBusinessType = task.businessType === businessType;
    const matchBusinessCategory = task.businessCategory === businessCategory;
    const matchSearch =
      task.taskNo.toLowerCase().includes(searchText.toLowerCase()) ||
      (task.preEntryNo && task.preEntryNo.toLowerCase().includes(searchText.toLowerCase()));
    const matchStatus = statusFilter === 'all' || task.status === statusFilter;
    let matchDate = true;
    if (dateRange) {
      const taskDate = dayjs(task.createdAt);
      matchDate = taskDate.isAfter(dateRange[0]) && taskDate.isBefore(dateRange[1]);
    }
    return matchBusinessType && matchBusinessCategory && matchSearch && matchStatus && matchDate;
  });

  const handleDelete = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        mutate(); // 刷新数据
        message.success('删除成功');
      }
    } catch {
      message.error('删除失败，请重试');
    }
  };

  const handleEdit = (taskId: string) => {
    router.push(`/dashboard/tasks/${taskId}`);
  };

  const columns = [
    { title: '任务编号', dataIndex: 'taskNo', key: 'taskNo', width: 180 },
    { title: '预录入编号', dataIndex: 'preEntryNo', key: 'preEntryNo', width: 180, render: (v: string | null) => v || '待生成' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: TaskStatus) => {
        const info = TASK_STATUS_LABELS[status] || { text: status, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    { title: '材料数量', key: 'materialCount', width: 100, render: (_: any, r: any) => r.materials?.length || 0 },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180, render: (d: Date) => formatDate(d) },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record.id)}>编辑</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      ),
    },
  ];

  const pendingCount = filteredTasks.filter((t: any) =>
    ['DRAFT', 'EDITING', 'EXTRACTING'].includes(t.status)
  ).length;

  if (error) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-red-500 mb-4">加载失败，请重试</p>
          <Button onClick={() => mutate()}>重新加载</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-gray-500">{description} · 共 {filteredTasks.length} 条 · 待处理 {pendingCount} 条</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => mutate()} loading={isLoading}>刷新</Button>
          <Button icon={<ExportOutlined />} onClick={() => message.info('导出功能开发中')}>导出</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push(createUrl)}>新建任务</Button>
        </Space>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Spin size="large" />
          </div>
        ) : (
          <>
            <Space className="mb-4" size="middle" wrap>
              <Input
                placeholder="搜索任务编号、预录入号..."
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
              <RangePicker
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                placeholder={['开始日期', '结束日期']}
                style={{ width: 300 }}
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
              locale={{
                emptyText: (
                  <div className="py-8">
                    <p className="text-gray-400 mb-2">还没有{title}任务</p>
                    <Button type="primary" onClick={() => router.push(createUrl)}>立即创建第一个任务</Button>
                  </div>
                ),
              }}
            />
          </>
        )}
      </Card>
    </div>
  );
}
