'use client';

import { useState } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Table,
  Space,
  Modal,
  message,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { useTaskStore } from '@/lib/store';
import { Task, DeclarationItem } from '@/types';
import { MOCK_DECLARATION_DATA } from '@/lib/mockData';
import * as XLSX from 'xlsx';

interface DeclarationFormProps {
  task: Task;
}

export function DeclarationForm({ task }: DeclarationFormProps) {
  const { updateTask } = useTaskStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<DeclarationItem[]>(
    task.declarationData?.items || [
      {
        itemNo: 1,
        goodsName: '',
        specs: '',
        quantity: 0,
        unit: '个',
        unitCode: '035',
        countryOfOrigin: '',
        countryCode: '',
        unitPrice: 0,
        totalPrice: 0,
        currency: '美元',
        currencyCode: '502',
        exemption: '照章征税',
        declarationElements: '',
      },
    ]
  );

  // 模拟 AI 提取
  const handleAIExtract = () => {
    setLoading(true);
    setTimeout(() => {
      // 使用模拟数据填充表单
      const mockData = MOCK_DECLARATION_DATA[task.businessType as keyof typeof MOCK_DECLARATION_DATA];
      if (mockData) {
        form.setFieldsValue(mockData.header);
        setItems(mockData.items);
        updateTask(task.id, {
          declarationData: mockData,
          status: 'processing',
        });
        message.success('AI 提取成功！请检查并补充信息');
      } else {
        message.warning('该业务类型暂无模拟数据，请手动填写');
      }
      setLoading(false);
    }, 2000);
  };

  // 保存表单
  const handleSave = () => {
    form.validateFields().then((values) => {
      const declarationData = {
        header: values,
        items,
      };
      updateTask(task.id, {
        declarationData,
        status: 'processing',
      });
      message.success('保存成功');
    });
  };

  // 添加商品
  const handleAddItem = () => {
    const newItem: DeclarationItem = {
      itemNo: items.length + 1,
      goodsName: '',
      specs: '',
      quantity: 0,
      unit: '个',
      unitCode: '035',
      countryOfOrigin: '',
      countryCode: '',
      unitPrice: 0,
      totalPrice: 0,
      currency: '美元',
      currencyCode: '502',
      exemption: '照章征税',
      declarationElements: '',
    };
    setItems([...items, newItem]);
  };

  // 删除商品
  const handleDeleteItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    // 重新编号
    newItems.forEach((item, i) => (item.itemNo = i + 1));
    setItems(newItems);
  };

  // 更新商品
  const handleUpdateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // 自动计算总价
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].totalPrice = newItems[index].quantity * newItems[index].unitPrice;
    }

    setItems(newItems);
  };

  // 导出 Excel
  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new();

    // 表头信息工作表
    const headerData = form.getFieldsValue();
    const headerSheet = XLSX.utils.json_to_sheet([
      { 字段: '预录入编号', 值: headerData.preEntryNo || task.preEntryNo },
      { 字段: '境内收发货人', 值: headerData.domesticConsignee },
      { 字段: '境内收发货人编码', 值: headerData.domesticConsigneeCode },
      { 字段: '境外收发货人', 值: headerData.overseasConsignee },
      { 字段: '申报单位', 值: headerData.declarant },
      { 字段: '运输方式', 值: headerData.transportMode },
      { 字段: '运输工具名称', 值: headerData.vesselName },
      { 字段: '航次号', 值: headerData.voyageNo },
      { 字段: '提单号', 值: headerData.billNo },
      { 字段: '贸易方式', 值: headerData.tradeMode },
      { 字段: '征免性质', 值: headerData.exemptionMode },
      { 字段: '起运国/运抵国', 值: headerData.countryOfOrigin },
      { 字段: '装货港/指运港', 值: headerData.portOfLoading },
      { 字段: '成交方式', 值: headerData.transactionMode },
      { 字段: '运费', 值: headerData.freight },
      { 字段: '保费', 值: headerData.insurance },
      { 字段: '合同协议号', 值: headerData.contractNo },
      { 字段: '件数', 值: headerData.packages },
      { 字段: '包装种类', 值: headerData.packageType },
      { 字段: '毛重(KG)', 值: headerData.grossWeight },
      { 字段: '净重(KG)', 值: headerData.netWeight },
      { 字段: '集装箱号', 值: headerData.containerNo },
    ]);
    XLSX.utils.book_append_sheet(workbook, headerSheet, '表头信息');

    // 商品明细工作表
    const itemsData = items.map((item) => ({
      项号: item.itemNo,
      商品名称: item.goodsName,
      规格型号: item.specs,
      申报要素: item.declarationElements,
      数量: item.quantity,
      单位: item.unit,
      原产国: item.countryOfOrigin,
      单价: item.unitPrice,
      总价: item.totalPrice,
      币制: item.currency,
      征免: item.exemption,
    }));
    const itemsSheet = XLSX.utils.json_to_sheet(itemsData);
    XLSX.utils.book_append_sheet(workbook, itemsSheet, '商品明细');

    // 导出文件
    XLSX.writeFile(workbook, `${task.preEntryNo}_申报要素.xlsx`);
    message.success('Excel 文件已生成');
  };

  const columns = [
    {
      title: '项号',
      dataIndex: 'itemNo',
      width: 60,
      render: (_: any, record: any, index: number) => index + 1,
    },
    {
      title: '商品名称',
      dataIndex: 'goodsName',
      width: 150,
      render: (value: any, record: any, index: number) => (
        <Input
          value={value}
          onChange={(e) => handleUpdateItem(index, 'goodsName', e.target.value)}
          placeholder="商品名称"
        />
      ),
    },
    {
      title: '规格型号',
      dataIndex: 'specs',
      width: 200,
      render: (value: any, record: any, index: number) => (
        <Input
          value={value}
          onChange={(e) => handleUpdateItem(index, 'specs', e.target.value)}
          placeholder="规格型号"
        />
      ),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      width: 80,
      render: (value: any, record: any, index: number) => (
        <InputNumber
          value={value}
          onChange={(v) => handleUpdateItem(index, 'quantity', v || 0)}
          min={0}
          className="w-full"
        />
      ),
    },
    {
      title: '单位',
      dataIndex: 'unit',
      width: 80,
      render: (value: any, record: any, index: number) => (
        <Input
          value={value}
          onChange={(e) => handleUpdateItem(index, 'unit', e.target.value)}
        />
      ),
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      width: 100,
      render: (value: any, record: any, index: number) => (
        <InputNumber
          value={value}
          onChange={(v) => handleUpdateItem(index, 'unitPrice', v || 0)}
          min={0}
          precision={2}
          className="w-full"
        />
      ),
    },
    {
      title: '总价',
      dataIndex: 'totalPrice',
      width: 100,
      render: (value: any) => value.toFixed(2),
    },
    {
      title: '操作',
      width: 60,
      render: (_: any, record: any, index: number) => (
        <Button
          type="link"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteItem(index)}
          disabled={items.length === 1}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-medium">申报要素编辑</h3>
        <Space>
          {!task.declarationData && (
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={handleAIExtract}
              loading={loading}
            >
              AI 智能提取
            </Button>
          )}
          <Button icon={<SaveOutlined />} onClick={handleSave}>
            保存草稿
          </Button>
          <Button icon={<CheckOutlined />} onClick={handleExportExcel}>
            导出 Excel
          </Button>
        </Space>
      </div>

      {/* 表头信息 */}
      <Card title="表头信息" className="mb-4">
        <Form form={form} layout="vertical">
          <div className="grid grid-cols-3 gap-4">
            <Form.Item label="预录入编号" name="preEntryNo" initialValue={task.preEntryNo}>
              <Input disabled />
            </Form.Item>
            <Form.Item label="境内收发货人" name="domesticConsignee">
              <Input placeholder="境内收发货人中文名称" />
            </Form.Item>
            <Form.Item label="收发货人编码" name="domesticConsigneeCode">
              <Input placeholder="15位海关编码" maxLength={15} />
            </Form.Item>
            <Form.Item label="境外收发货人" name="overseasConsignee">
              <Input placeholder="境外收发货人名称（英文）" />
            </Form.Item>
            <Form.Item label="申报单位" name="declarant">
              <Input placeholder="申报单位名称" />
            </Form.Item>
            <Form.Item label="申报单位编码" name="declarantCode">
              <Input placeholder="15位海关编码" maxLength={15} />
            </Form.Item>
            <Form.Item label="运输方式" name="transportMode">
              <Select
                placeholder="选择运输方式"
                options={[
                  { label: '水路运输', value: '水路运输' },
                  { label: '航空运输', value: '航空运输' },
                  { label: '铁路运输', value: '铁路运输' },
                  { label: '公路运输', value: '公路运输' },
                ]}
              />
            </Form.Item>
            <Form.Item label="运输工具名称" name="vesselName">
              <Input placeholder="船名/航班号等" />
            </Form.Item>
            <Form.Item label="航次号" name="voyageNo">
              <Input placeholder="航次号" />
            </Form.Item>
            <Form.Item label="提单号" name="billNo">
              <Input placeholder="提单号" />
            </Form.Item>
            <Form.Item label="贸易方式" name="tradeMode">
              <Select
                placeholder="选择贸易方式"
                options={[
                  { label: '一般贸易', value: '一般贸易' },
                  { label: '来料加工', value: '来料加工' },
                  { label: '进料加工', value: '进料加工' },
                ]}
              />
            </Form.Item>
            <Form.Item label="征免性质" name="exemptionMode">
              <Select
                placeholder="选择征免性质"
                options={[
                  { label: '一般征税', value: '一般征税' },
                  { label: '照章征税', value: '照章征税' },
                  { label: '全额免税', value: '全额免税' },
                ]}
              />
            </Form.Item>
            <Form.Item label="起运国/运抵国" name="countryOfOrigin">
              <Input placeholder="国家名称" />
            </Form.Item>
            <Form.Item label="装货港/指运港" name="portOfLoading">
              <Input placeholder="港口名称" />
            </Form.Item>
            <Form.Item label="成交方式" name="transactionMode">
              <Select
                placeholder="选择成交方式"
                options={[
                  { label: 'FOB', value: 'FOB' },
                  { label: 'CIF', value: 'CIF' },
                  { label: 'CFR', value: 'CFR' },
                ]}
              />
            </Form.Item>
            <Form.Item label="合同协议号" name="contractNo">
              <Input placeholder="合同号" />
            </Form.Item>
            <Form.Item label="件数" name="packages">
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item label="包装种类" name="packageType">
              <Input placeholder="如：纸箱、木箱等" />
            </Form.Item>
            <Form.Item label="毛重(KG)" name="grossWeight">
              <InputNumber min={0} precision={2} className="w-full" />
            </Form.Item>
            <Form.Item label="净重(KG)" name="netWeight">
              <InputNumber min={0} precision={2} className="w-full" />
            </Form.Item>
            <Form.Item label="集装箱号" name="containerNo">
              <Input placeholder="集装箱号" />
            </Form.Item>
          </div>
        </Form>
      </Card>

      {/* 商品明细 */}
      <Card
        title="商品明细"
        extra={
          <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddItem}>
            添加商品
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={items}
          rowKey={(record) => record.itemNo}
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
}
