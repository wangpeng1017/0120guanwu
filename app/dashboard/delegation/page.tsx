'use client'

/**
 * @file page.tsx
 * @desc 委托书生成页面
 */

import { useState } from 'react'
import { Upload, Button, message, Tabs, Alert, Card, Space, Typography, Spin } from 'antd'
import { UploadOutlined, FileExcelOutlined, DownloadOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload/interface'
import DelegationLetterPreview from '@/components/Delegation/DelegationLetterPreview'
import DelegationAgreementPreview from '@/components/Delegation/DelegationAgreementPreview'
import type { MappingResult } from '@/lib/delegation/mapper'

const { Title, Paragraph } = Typography

export default function DelegationPage() {
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<MappingResult | null>(null)

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning('请先选择Excel文件')
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      fileList.forEach(file => {
        if (file.originFileObj) {
          formData.append('files', file.originFileObj)
        }
      })

      const response = await fetch('/api/delegation/generate', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('生成失败')
      }

      const data = await response.json()
      setResult(data)
      message.success('生成成功！')
    } catch (error) {
      console.error('生成失败:', error)
      message.error('生成失败，请检查文件格式')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadLetter = async () => {
    if (!result) return

    try {
      const response = await fetch('/api/delegation/download-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delegationLetter: result.delegationLetter })
      })

      if (!response.ok) throw new Error('下载失败')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `委托书-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      message.success('下载成功！')
    } catch (error) {
      console.error('下载失败:', error)
      message.error('下载失败')
    }
  }

  const handleDownloadAgreement = async () => {
    if (!result) return

    try {
      const response = await fetch('/api/delegation/download-agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delegationAgreements: result.delegationAgreements })
      })

      if (!response.ok) throw new Error('下载失败')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `委托协议-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      message.success('下载成功！')
    } catch (error) {
      console.error('下载失败:', error)
      message.error('下载失败')
    }
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Title level={3}>电子代理报关委托材料生成</Title>
        <Paragraph type="secondary">
          上传装箱单、发票、合同等Excel文件，系统将自动提取数据并生成标准的委托书和委托协议
        </Paragraph>

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 文件上传区域 */}
          <Card title="1. 上传Excel文件" size="small">
            <Upload
              multiple
              accept=".xls,.xlsx"
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
              beforeUpload={() => false}
            >
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
            <div style={{ marginTop: 8 }}>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                支持的文件类型：灯具、汽车、食品、电商等报关资料 (.xls, .xlsx)
              </Paragraph>
            </div>
          </Card>

          {/* 生成按钮 */}
          <div>
            <Button
              type="primary"
              size="large"
              icon={<FileExcelOutlined />}
              onClick={handleUpload}
              loading={loading}
              disabled={fileList.length === 0}
            >
              生成委托材料
            </Button>
          </div>

          {/* 加载状态 */}
          {loading && (
            <Card>
              <Spin tip="正在处理文件，请稍候...">
                <div style={{ padding: '50px 0' }} />
              </Spin>
            </Card>
          )}

          {/* 预览区域 */}
          {result && !loading && (
            <>
              {/* 警告信息 */}
              {result.warnings && result.warnings.length > 0 && (
                <Alert
                  message="数据映射警告"
                  description={
                    <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                      {result.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  }
                  type="warning"
                  showIcon
                  closable
                />
              )}

              {/* 下载按钮 */}
              <Card title="2. 预览和下载" size="small">
                <Space>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={handleDownloadLetter}
                  >
                    下载委托书
                  </Button>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={handleDownloadAgreement}
                  >
                    下载委托协议
                  </Button>
                </Space>
              </Card>

              {/* Tab切换预览 */}
              <Tabs
                defaultActiveKey="letter"
                items={[
                  {
                    key: 'letter',
                    label: '委托书',
                    children: <DelegationLetterPreview data={result.delegationLetter} />
                  },
                  {
                    key: 'agreement',
                    label: `委托协议 (${result.delegationAgreements.length}条)`,
                    children: <DelegationAgreementPreview data={result.delegationAgreements} />
                  }
                ]}
              />
            </>
          )}
        </Space>
      </Card>
    </div>
  )
}
