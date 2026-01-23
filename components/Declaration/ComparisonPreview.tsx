'use client';

import { Card, Col, Row, Form, Input, Table, Progress, Tabs, Tag } from 'antd';
import { MaterialType } from '@/types/enums';

interface ExtractedField {
  fieldName: string;
  value: string | number | object | null;
  confidence: number;
  source: string;
}

interface ExtractionResult {
  header: Record<string, ExtractedField>;
  body: Array<Record<string, ExtractedField>>;
  sourceMaterials: Array<{
    materialType: MaterialType;
    fileName: string;
    extractedFields: string[];
  }>;
  overallConfidence: number;
}

interface MaterialFile {
  id: string;
  fileName: string;
  fileUrl: string;
  materialType: MaterialType;
}

interface ComparisonPreviewProps {
  businessType: string;
  extractionResult: ExtractionResult;
  materials: MaterialFile[];
  onFieldChange?: (fieldName: string, value: any) => void;
  onConfirm?: () => void;
}

export function ComparisonPreview({
  businessType,
  extractionResult,
  materials,
  onFieldChange,
  onConfirm,
}: ComparisonPreviewProps) {
  const [form] = Form.useForm();

  // 表头字段列表
  const headerFields = Object.entries(extractionResult.header).map(
    ([key, field]) => ({
      key,
      label: field.fieldName,
      value: field.value,
      confidence: field.confidence,
      source: field.source,
    })
  );

  // 商品明细表格列定义
  const goodsColumns = [
    {
      title: '项号',
      dataIndex: '项号',
      key: 'itemNo',
      width: 80,
    },
    {
      title: '商品名称',
      dataIndex: '商品名称',
      key: 'goodsName',
      width: 200,
      editable: true,
    },
    {
      title: '数量',
      dataIndex: '数量',
      key: 'quantity',
      width: 100,
      editable: true,
    },
    {
      title: '单位',
      dataIndex: '单位',
      key: 'unit',
      width: 80,
      editable: true,
    },
    {
      title: '单价',
      dataIndex: '单价',
      key: 'unitPrice',
      width: 100,
      editable: true,
    },
    {
      title: '总价',
      dataIndex: '总价',
      key: 'totalPrice',
      width: 100,
      editable: true,
    },
    {
      title: '置信度',
      dataIndex: '_confidence',
      key: 'confidence',
      width: 120,
      render: (confidence: number) => (
        <Progress
          percent={Math.round((confidence || 0) * 100)}
          size="small"
          status={(confidence || 0) < 0.8 ? 'exception' : 'success'}
        />
      ),
    },
  ];

  // 转换 body 数据为表格格式
  const tableData = extractionResult.body.map((item, index) => {
    const row: any = {
      key: index,
      _confidence: extractionResult.overallConfidence,
    };

    Object.entries(item).forEach(([key, field]) => {
      row[field.fieldName] = field.value;
      // 使用第一个字段的置信度作为整体置信度
      if (key === Object.keys(item)[0]) {
        row._confidence = field.confidence;
      }
    });

    return row;
  });

  // 更新字段值
  const handleFieldChange = (fieldName: string, value: any) => {
    form.setFieldValue(fieldName, value);
    onFieldChange?.(fieldName, value);
  };

  // 获取置信度状态
  const getConfidenceStatus = (confidence: number): 'success' | 'normal' | 'active' | 'exception' => {
    if (confidence >= 0.9) return 'success';
    if (confidence >= 0.8) return 'normal';
    if (confidence >= 0.6) return 'active';
    return 'exception';
  };

  // 获取置信度颜色
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return '#52c41a';
    if (confidence >= 0.8) return '#1890ff';
    if (confidence >= 0.6) return '#faad14';
    return '#f5222d';
  };

  return (
    <div className="space-y-4">
      {/* 整体置信度 */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">提取结果</div>
            <div className="text-sm text-gray-500 mt-1">
              业务类型：{businessType}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">整体置信度</div>
            <div
              className="text-2xl font-bold"
              style={{ color: getConfidenceColor(extractionResult.overallConfidence) }}
            >
              {Math.round(extractionResult.overallConfidence * 100)}%
            </div>
          </div>
        </div>
        <Progress
          percent={Math.round(extractionResult.overallConfidence * 100)}
          strokeColor={getConfidenceColor(extractionResult.overallConfidence)}
          className="mt-3"
        />
      </Card>

      <Row gutter={16}>
        {/* 左侧：原始单据预览 */}
        <Col span={12}>
          <Card title="原始单据预览" className="h-full">
            <Tabs
              items={materials.map(material => ({
                key: material.id,
                label: material.fileName,
                children: (
                  <div className="bg-gray-50 rounded p-4 text-center">
                    <div className="text-gray-500 mb-2">
                      {material.materialType}
                    </div>
                    {/* 实际使用时应该渲染 PDF 预览 */}
                    <div className="text-sm text-gray-400">
                      [单据预览功能待实现]
                    </div>
                  </div>
                ),
              }))}
            />
          </Card>
        </Col>

        {/* 右侧：提取结果编辑 */}
        <Col span={12}>
          <Card title="提取结果" className="h-full">
            <Form form={form} layout="vertical">
              {/* 表头信息 */}
              <div className="mb-6">
                <h3 className="text-base font-semibold mb-3">表头信息</h3>
                <div className="space-y-3">
                  {headerFields.map(field => (
                    <div
                      key={field.key}
                      className={`p-3 rounded border ${
                        field.confidence < 0.8
                          ? 'border-yellow-300 bg-yellow-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <label className="text-sm font-medium">
                          {field.label}
                        </label>
                        {field.confidence < 0.8 && (
                          <Tag color="warning">请核对</Tag>
                        )}
                      </div>
                      <Input
                        defaultValue={String(field.value || '')}
                        onChange={e =>
                          handleFieldChange(field.key, e.target.value)
                        }
                        placeholder="请输入或确认"
                      />
                      <div className="mt-2">
                        <Progress
                          percent={Math.round(field.confidence * 100)}
                          size="small"
                          status={getConfidenceStatus(field.confidence)}
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          来源：{field.source}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 商品明细 */}
              <div>
                <h3 className="text-base font-semibold mb-3">商品明细</h3>
                <Table
                  columns={goodsColumns}
                  dataSource={tableData}
                  pagination={false}
                  size="small"
                  bordered
                  scroll={{ y: 400 }}
                />
              </div>
            </Form>
          </Card>
        </Col>
      </Row>

      {/* 底部操作栏 */}
      <Card>
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            共 {materials.length} 份单据，提取{' '}
            {Object.keys(extractionResult.header).length} 个表头字段，{' '}
            {extractionResult.body.length} 个商品
          </div>
          <div className="space-x-2">
            {/* 实际使用时添加取消、确认等按钮 */}
            {/* <Button>取消</Button> */}
            {/* <Button type="primary" onClick={onConfirm}>确认并保存</Button> */}
          </div>
        </div>
      </Card>
    </div>
  );
}

/**
 * 简化版对比预览（仅显示）
 */
export function ComparisonPreviewSimple({
  extractionResult,
}: {
  extractionResult: ExtractionResult;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <div className="text-center">
          <div className="text-sm text-gray-500">整体置信度</div>
          <div className="text-3xl font-bold text-blue-600">
            {Math.round(extractionResult.overallConfidence * 100)}%
          </div>
        </div>
      </Card>

      <Card title="提取的表头字段">
        <div className="space-y-2">
          {Object.entries(extractionResult.header).map(([key, field]) => (
            <div
              key={key}
              className="flex justify-between items-center p-2 bg-gray-50 rounded"
            >
              <span className="text-sm">{field.fieldName}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">{String(field.value || '-')}</span>
                <Progress
                  percent={Math.round(field.confidence * 100)}
                  size="small"
                  className="w-20"
                  status={field.confidence < 0.8 ? 'exception' : 'success'}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title={`商品明细 (${extractionResult.body.length}项)`}>
        <Table
          columns={[
            { title: '项号', dataIndex: '项号', key: 'itemNo', width: 60 },
            {
              title: '商品名称',
              dataIndex: '商品名称',
              key: 'goodsName',
            },
            { title: '数量', dataIndex: '数量', key: 'quantity', width: 80 },
            { title: '单位', dataIndex: '单位', key: 'unit', width: 80 },
          ]}
          dataSource={extractionResult.body.map((item, index) => {
            const row: any = { key: index };
            Object.values(item).forEach((field: any) => {
              row[field.fieldName] = field.value;
            });
            return row;
          })}
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
}
