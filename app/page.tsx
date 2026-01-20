'use client';

import { Button, Card, Col, Row, Statistic } from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { useTaskStore } from '@/lib/store';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';

function HomePageContent() {
  const { tasks } = useTaskStore();

  const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
  const processingTasks = tasks.filter((t) => t.status === 'processing').length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;

  const quickActions = [
    {
      title: '进口申报',
      description: '一线入区、二线出区',
      icon: <FileTextOutlined className="text-2xl text-blue-500" />,
      href: '/dashboard/import',
      color: 'bg-blue-50',
    },
    {
      title: '出口申报',
      description: '一线出区、二线进区',
      icon: <FileTextOutlined className="text-2xl text-green-500" />,
      href: '/dashboard/export',
      color: 'bg-green-50',
    },
    {
      title: '转仓申报',
      description: '转仓转入、转出',
      icon: <FileTextOutlined className="text-2xl text-orange-500" />,
      href: '/dashboard/transfer',
      color: 'bg-orange-50',
    },
    {
      title: '任务管理',
      description: '查看所有申报任务',
      icon: <FileTextOutlined className="text-2xl text-purple-500" />,
      href: '/dashboard/tasks',
      color: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-6 fade-in">
      {/* 欢迎区域 */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">关务AI+RPA智能申报系统</h1>
        <p className="text-blue-100">
          智能化关务申报辅助平台，支持进口、出口、转仓等多种业务场景
        </p>
      </div>

      {/* 统计数据 */}
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic
              title="待处理任务"
              value={pendingTasks}
              prefix={<ClockCircleOutlined className="text-orange-500" />}
              valueStyle={{ color: pendingTasks > 0 ? '#faad14' : undefined }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="处理中任务"
              value={processingTasks}
              prefix={<ClockCircleOutlined className="text-blue-500" />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="已完成任务"
              value={completedTasks}
              prefix={<CheckCircleOutlined className="text-green-500" />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 快捷操作 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">快捷操作</h2>
        <Row gutter={[16, 16]}>
          {quickActions.map((action) => (
            <Col span={6} key={action.href}>
              <Link href={action.href}>
                <Card
                  hoverable
                  className={`h-full ${action.color}`}
                  styles={{ body: { padding: '20px' } }}
                >
                  <div className="flex flex-col items-center text-center">
                    {action.icon}
                    <h3 className="text-lg font-medium mt-3">{action.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{action.description}</p>
                    <Button
                      type="link"
                      className="mt-3 p-0"
                      icon={<ArrowRightOutlined />}
                    >
                      开始
                    </Button>
                  </div>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>
      </div>

      {/* 系统说明 */}
      <Card title="系统功能说明">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <h3 className="font-medium mb-2">材料智能识别</h3>
            <p className="text-sm text-gray-500">
              支持PDF、Excel、图片等多种格式，AI自动提取申报要素
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2">申报表单生成</h3>
            <p className="text-sm text-gray-500">
              按单一窗口格式自动生成申报表格，减少手工录入
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2">文件智能归档</h3>
            <p className="text-sm text-gray-500">
              按规则自动重命名和归档，支持批量下载
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function HomePage() {
  return (
    <DashboardLayout>
      <HomePageContent />
    </DashboardLayout>
  );
}
