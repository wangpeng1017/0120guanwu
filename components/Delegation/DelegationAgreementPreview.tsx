'use client'

/**
 * @file DelegationAgreementPreview.tsx
 * @desc 委托协议预览组件
 */

import { Table, Tag, Card, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { DelegationAgreement } from '@/lib/types/delegation'

const { Title } = Typography

interface DelegationAgreementPreviewProps {
  data: DelegationAgreement[]
}

const STATUS_MAP: Record<NonNullable<DelegationAgreement['agreementStatus']>, { text: string; color: string }> = {
  pending_confirmation: { text: '待确认', color: 'blue' },
  sent_to_customs: { text: '已发海关', color: 'cyan' },
  ready_for_declaration: { text: '待申报', color: 'orange' },
  rejected: { text: '已拒绝', color: 'red' },
  in_use: { text: '正使用', color: 'processing' },
  used_by_customs: { text: '海关已用', color: 'green' },
  expired: { text: '已过期', color: 'default' },
  cancellation_pending: { text: '撤销待确认', color: 'warning' },
  cancellation_confirmed: { text: '撤销已确认', color: 'orange' },
  cancelled: { text: '已撤销', color: 'default' },
  creation_failed: { text: '新增失败', color: 'error' },
  cancellation_failed: { text: '撤销失败', color: 'error' }
}

export default function DelegationAgreementPreview({ data }: DelegationAgreementPreviewProps) {
  const columns: ColumnsType<DelegationAgreement> = [
    {
      title: '序号',
      dataIndex: 'serialNumber',
      key: 'serialNumber',
      width: 60,
      align: 'center'
    },
    {
      title: '主要货物名称',
      dataIndex: 'mainGoodsName',
      key: 'mainGoodsName',
      width: 200,
      ellipsis: true
    },
    {
      title: 'HS编码',
      dataIndex: 'hsCode',
      key: 'hsCode',
      width: 120
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'right',
      render: (value, record) => value ? `${value} ${record.unit || ''}` : '-'
    },
    {
      title: '总值',
      dataIndex: 'totalValue',
      key: 'totalValue',
      width: 120,
      align: 'right',
      render: (value, record) => `${record.currency || 'USD'} ${value.toFixed(2)}`
    },
    {
      title: '贸易方式',
      dataIndex: 'tradeMode',
      key: 'tradeMode',
      width: 140,
      ellipsis: true
    },
    {
      title: '原产地',
      dataIndex: 'originPlace',
      key: 'originPlace',
      width: 100
    },
    {
      title: '进出口日期',
      dataIndex: 'importExportDate',
      key: 'importExportDate',
      width: 120
    },
    {
      title: '状态',
      dataIndex: 'agreementStatus',
      key: 'agreementStatus',
      width: 120,
      fixed: 'right',
      render: (status: DelegationAgreement['agreementStatus']) => {
        if (!status) return '-'
        const statusInfo = STATUS_MAP[status]
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
      }
    }
  ]

  return (
    <Card>
      <Title level={4}>电子代理报关委托协议</Title>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="serialNumber"
        scroll={{ x: 1200 }}
        pagination={{
          pageSize: 10,
          showTotal: (total) => `共 ${total} 条`,
          showSizeChanger: true,
          showQuickJumper: true
        }}
        size="small"
      />
    </Card>
  )
}
