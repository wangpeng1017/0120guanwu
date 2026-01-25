'use client'

/**
 * @file DelegationLetterPreview.tsx
 * @desc 委托书预览组件
 */

import { Descriptions, Tag, Card, Typography } from 'antd'
import type { DelegationLetter } from '@/lib/types/delegation'

const { Title } = Typography

interface DelegationLetterPreviewProps {
  data: DelegationLetter
}

const DELEGATION_TYPE_MAP = {
  single: '单次委托',
  'long-term': '长期委托'
}

const STATUS_MAP = {
  initiated: { text: '已发起', color: 'blue' },
  confirmed: { text: '已确认', color: 'green' },
  rejected: { text: '已拒绝', color: 'red' },
  expired: { text: '已过期', color: 'default' },
  terminated: { text: '已终止', color: 'orange' }
}

export default function DelegationLetterPreview({ data }: DelegationLetterPreviewProps) {
  return (
    <Card>
      <Title level={4}>电子代理报关委托书</Title>

      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="委托方企业名称" span={2}>
          {data.clientCompanyName || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="委托方海关编码">
          {data.clientCustomsCode || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="委托方统一社会信用代码">
          {data.clientSocialCreditCode || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="委托方授权签字人">
          {data.clientAuthorizedSigner || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="委托方联系电话">
          {data.clientContactPhone || '-'}
        </Descriptions.Item>
      </Descriptions>

      <div style={{ marginTop: 16 }} />

      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="被委托方企业名称" span={2}>
          {data.agentCompanyName || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="被委托方海关编码">
          {data.agentCustomsCode || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="被委托方统一社会信用代码">
          {data.agentSocialCreditCode || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="被委托方授权签字人">
          {data.agentAuthorizedSigner || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="被委托方联系电话">
          {data.agentContactPhone || '-'}
        </Descriptions.Item>
      </Descriptions>

      <div style={{ marginTop: 16 }} />

      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="委托类型">
          {DELEGATION_TYPE_MAP[data.delegationType]}
        </Descriptions.Item>
        <Descriptions.Item label="委托有效期">
          {data.validityPeriod} 个月
        </Descriptions.Item>
        <Descriptions.Item label="委托内容" span={2}>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {data.delegationContent.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </Descriptions.Item>
        <Descriptions.Item label="签署日期">
          {data.signDate || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="状态">
          {data.status && (
            <Tag color={STATUS_MAP[data.status].color}>
              {STATUS_MAP[data.status].text}
            </Tag>
          )}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  )
}
