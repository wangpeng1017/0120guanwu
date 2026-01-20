'use client';

import { Card, Row, Col, Button, List, Tag } from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useTaskStore } from '@/lib/store';
import { formatDate } from '@/lib/utils';
import { TASK_STATUS_LABELS, BUSINESS_DIRECTION_LABELS, SUPERVISION_LEVEL_LABELS, TRADE_MODE_LABELS } from '@/lib/constants';

// 获取业务类型名称
function getBusinessTypeName(task: any): string {
  const direction = BUSINESS_DIRECTION_LABELS[task.businessDirection] || task.businessDirection;
  const level = SUPERVISION_LEVEL_LABELS[task.supervisionLevel] || task.supervisionLevel;
  const mode = TRADE_MODE_LABELS[task.tradeMode] || task.tradeMode;
  return `${direction}-${level}-${mode}`;
}

export default function DashboardPage() {
  const { tasks } = useTaskStore();

  const recentTasks = [...tasks]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6 fade-in">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">控制台</h1>
          <p className="text-gray-500">查看申报任务和系统状态</p>
        </div>
        <Link href="/import">
          <Button type="primary" icon={<PlusOutlined />} size="large">
            创建新任务
          </Button>
        </Link>
      </div>

      {/* 快捷操作 */}
      <Row gutter={16}>
        <Col span={6}>
          <Link href="/dashboard/import">
            <Card hoverable className="text-center h-full">
              <div className="text-3xl text-blue-500 mb-2">📥</div>
              <h3 className="font-medium">进口申报</h3>
            </Card>
          </Link>
        </Col>
        <Col span={6}>
          <Link href="/dashboard/export">
            <Card hoverable className="text-center h-full">
              <div className="text-3xl text-green-500 mb-2">📤</div>
              <h3 className="font-medium">出口申报</h3>
            </Card>
          </Link>
        </Col>
        <Col span={6}>
          <Link href="/dashboard/transfer">
            <Card hoverable className="text-center h-full">
              <div className="text-3xl text-orange-500 mb-2">🔄</div>
              <h3 className="font-medium">转仓申报</h3>
            </Card>
          </Link>
        </Col>
        <Col span={6}>
          <Link href="/dashboard/tasks">
            <Card hoverable className="text-center h-full">
              <div className="text-3xl text-purple-500 mb-2">📋</div>
              <h3 className="font-medium">任务管理</h3>
            </Card>
          </Link>
        </Col>
      </Row>

      {/* 最近任务 */}
      <Card
        title="最近任务"
        extra={
          <Link href="/tasks">
            <Button type="link">查看全部</Button>
          </Link>
        }
      >
        {recentTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            暂无任务，<Link href="/import" className="text-blue-500">创建新任务</Link>
          </div>
        ) : (
          <List
            dataSource={recentTasks}
            renderItem={(task) => {
              const statusInfo = TASK_STATUS_LABELS[task.status] || { text: task.status, color: 'default' };
              const businessName = getBusinessTypeName(task);
              return (
                <List.Item
                  actions={[
                    <Link key="view" href={`/dashboard/tasks/${task.id}`}>
                      <Button type="link" icon={<EyeOutlined />}>
                        查看
                      </Button>
                    </Link>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <div className="flex items-center gap-3">
                        <span>{businessName}</span>
                        <Tag color={statusInfo.color}>
                          {statusInfo.text}
                        </Tag>
                      </div>
                    }
                    description={
                      <div className="flex gap-6 text-sm">
                        <span>任务编号: {task.taskNo}</span>
                        <span>预录入编号: {task.preEntryNo || '待生成'}</span>
                        <span>创建时间: {formatDate(task.createdAt)}</span>
                      </div>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </Card>
    </div>
  );
}
