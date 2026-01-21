'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Table,
  Space,
  message,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { Task, DeclarationItem, DeclarationHeader } from '@/types';

interface DeclarationFormProps {
  task: Task;
  onTaskUpdated?: () => void;
}

// 默认空商品项
const emptyItem: DeclarationItem = {
  itemNo: 1,
  goodsName: '',
  specs: '',
  hsCode: '',
  quantity: 0,
  unit: '',
  unitPrice: 0,
  totalPrice: 0,
  currency: '',
  countryOfOrigin: '',
  dutyRate: 0,
  vatRate: 0,
  notes: '',
};

export function DeclarationForm({ task, onTaskUpdated }: DeclarationFormProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [items, setItems] = useState<DeclarationItem[]>([emptyItem]);
  const [declarationData, setDeclarationData] = useState<{
    header: DeclarationHeader | null;
    items: DeclarationItem[];
  }>({ header: null, items: [emptyItem] });

  // 加载申报数据
  useEffect(() => {
    if (task.declarations && task.declarations.length > 0) {
      const declaration = task.declarations[0];
      const headerData = declaration.headerData as Record<string, any>;
      const bodyData = declaration.bodyData as Array<Record<string, any>>;

      // 转换表头数据
      const header: DeclarationHeader = {
        preEntryNo: headerData.preEntryNo?.value || task.preEntryNo || '',
        customsNo: headerData.customsNo?.value || task.customsNo || '',
        domesticConsignee: headerData.domesticConsignee?.value || '',
        overseasConsignee: headerData.overseasConsignee?.value || '',
        declarant: headerData.declarant?.value || '',
        transportMode: headerData.transportMode?.value || '',
        vesselName: headerData.vesselName?.value || '',
        voyageNo: headerData.voyageNo?.value || '',
        billNo: headerData.billNo?.value || '',
        tradeCountry: headerData.tradeCountry?.value || '',
        portOfLoading: headerData.portOfLoading?.value || '',
        portOfDischarge: headerData.portOfDischarge?.value || '',
        portOfEntry: headerData.portOfEntry?.value || '',
        destinationCountry: headerData.destinationCountry?.value || '',
        tradeMode: headerData.tradeMode?.value || '',
        taxMode: headerData.taxMode?.value || '',
        natureOfTax: headerData.natureOfTax?.value || '',
        grossWeight: headerData.grossWeight?.value || 0,
        netWeight: headerData.netWeight?.value || 0,
        packageCount: headerData.packageCount?.value || 0,
        packageType: headerData.packageType?.value || '',
        containerNo: headerData.containerNo?.value || '',
        tradeCurrency: headerData.tradeCurrency?.value || '',
        totalPrice: headerData.totalPrice?.value || 0,
        invoiceNo: headerData.invoiceNo?.value || '',
        invoiceDate: headerData.invoiceDate?.value || '',
        contractNo: headerData.contractNo?.value || '',
        notes: headerData.notes?.value || '',
      };

      // 转换商品明细
      const transformedItems: DeclarationItem[] = bodyData.map(item => ({
        itemNo: item.itemNo?.value || 0,
        goodsName: item.goodsName?.value || '',
        specs: item.specs?.value || '',
        hsCode: item.hsCode?.value || '',
        quantity: item.quantity?.value || 0,
        unit: item.unit?.value || '',
        unitPrice: item.unitPrice?.value || 0,
        totalPrice: item.totalPrice?.value || 0,
        currency: item.currency?.value || '',
        countryOfOrigin: item.countryOfOrigin?.value || '',
        dutyRate: item.dutyRate?.value || 0,
        vatRate: item.vatRate?.value || 0,
        notes: item.notes?.value || '',
      }));

      form.setFieldsValue(header);
      setItems(transformedItems);
      setDeclarationData({ header, items: transformedItems });
    }
  }, [task]);

  // AI 提取 - 直接更新本地状态，不需要刷新页面
  const handleAIExtract = async () => {
    setExtracting(true);
    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id }),
      });

      const result = await response.json();

      if (result.success) {
        message.success('AI 提取成功！请检查并补充信息');

        // 直接更新本地状态，填充提取的数据
        if (result.extracted) {
          const { header, items } = result.extracted;

          // 转换表头数据
          const headerValues: DeclarationHeader = {
            preEntryNo: header?.preEntryNo?.value || '',
            customsNo: header?.customsNo?.value || '',
            domesticConsignee: header?.domesticConsignee?.value || '',
            overseasConsignee: header?.overseasConsignee?.value || '',
            declarant: header?.declarant?.value || '',
            transportMode: header?.transportMode?.value || '',
            vesselName: header?.vesselName?.value || '',
            voyageNo: header?.voyageNo?.value || '',
            billNo: header?.billNo?.value || '',
            tradeCountry: header?.tradeCountry?.value || '',
            portOfLoading: header?.portOfLoading?.value || '',
            portOfDischarge: header?.portOfDischarge?.value || '',
            portOfEntry: header?.portOfEntry?.value || '',
            destinationCountry: header?.destinationCountry?.value || '',
            tradeMode: header?.tradeMode?.value || '',
            taxMode: header?.taxMode?.value || '',
            natureOfTax: header?.natureOfTax?.value || '',
            grossWeight: header?.grossWeight?.value || 0,
            netWeight: header?.netWeight?.value || 0,
            packageCount: header?.packageCount?.value || 0,
            packageType: header?.packageType?.value || '',
            containerNo: header?.containerNo?.value || '',
            tradeCurrency: header?.tradeCurrency?.value || '',
            totalPrice: header?.totalPrice?.value || 0,
            invoiceNo: header?.invoiceNo?.value || '',
            invoiceDate: header?.invoiceDate?.value || '',
            contractNo: header?.contractNo?.value || '',
            notes: header?.notes?.value || '',
          };

          // 转换商品明细
          const transformedItems: DeclarationItem[] = items.map((item: any) => ({
            itemNo: item.itemNo?.value || 0,
            goodsName: item.goodsName?.value || '',
            specs: item.specs?.value || '',
            hsCode: item.hsCode?.value || '',
            quantity: item.quantity?.value || 0,
            unit: item.unit?.value || '',
            unitPrice: item.unitPrice?.value || 0,
            totalPrice: item.totalPrice?.value || 0,
            currency: item.currency?.value || '',
            countryOfOrigin: item.countryOfOrigin?.value || '',
            dutyRate: item.dutyRate?.value || 0,
            vatRate: item.vatRate?.value || 0,
            notes: item.notes?.value || '',
          }));

          // 更新表单
          form.setFieldsValue(headerValues);
          setItems(transformedItems);
          setDeclarationData({ header: headerValues, items: transformedItems });
        }

        // 通知父组件刷新任务数据（如果需要）
        if (onTaskUpdated) {
          onTaskUpdated();
        }
      } else {
        message.error(result.error || 'AI 提取失败');
      }
    } catch (error) {
      console.error('AI 提取失败:', error);
      message.error('AI 提取失败，请重试');
    } finally {
      setExtracting(false);
    }
  };

  // 保存表单
  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      // 调用 API 更新申报数据
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preEntryNo: values.preEntryNo,
        }),
      });

      if (response.ok) {
        message.success('保存成功');
      } else {
        message.error('保存失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败，请重试');
    }
  };

  // 添加商品
  const handleAddItem = () => {
    const newItem: DeclarationItem = {
      ...emptyItem,
      itemNo: items.length + 1,
    };
    setItems([...items, newItem]);
  };

  // 删除商品
  const handleDeleteItem = (index: number) => {
    if (items.length === 1) {
      message.warning('至少保留一条商品信息');
      return;
    }
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
      newItems[index].totalPrice = (newItems[index].quantity || 0) * (newItems[index].unitPrice || 0);
    }

    setItems(newItems);
  };

  // 生成并下载 Excel
  const handleGenerateExcel = async () => {
    try {
      const headerValues = form.getFieldsValue();
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          templateType: task.businessDirection === 'EXPORT' ? 'export' : 'import',
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 下载文件
        window.open(result.generatedFile.downloadUrl, '_blank');
        message.success('报关单生成成功');
      } else {
        message.error(result.error || '生成失败');
      }
    } catch (error) {
      console.error('生成失败:', error);
      message.error('生成失败，请重试');
    }
  };

  const columns = [
    {
      title: '项号',
      dataIndex: 'itemNo',
      width: 60,
      render: (_: any, _record: any, index: number) => index + 1,
    },
    {
      title: '商品名称',
      dataIndex: 'goodsName',
      width: 150,
      render: (value: any, _record: any, index: number) => (
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
      width: 150,
      render: (value: any, _record: any, index: number) => (
        <Input
          value={value}
          onChange={(e) => handleUpdateItem(index, 'specs', e.target.value)}
          placeholder="规格型号"
        />
      ),
    },
    {
      title: 'HS编码',
      dataIndex: 'hsCode',
      width: 100,
      render: (value: any, _record: any, index: number) => (
        <Input
          value={value}
          onChange={(e) => handleUpdateItem(index, 'hsCode', e.target.value)}
          placeholder="HS编码"
        />
      ),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      width: 80,
      render: (value: any, _record: any, index: number) => (
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
      render: (value: any, _record: any, index: number) => (
        <Input
          value={value}
          onChange={(e) => handleUpdateItem(index, 'unit', e.target.value)}
          placeholder="单位"
        />
      ),
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      width: 100,
      render: (value: any, _record: any, index: number) => (
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
      render: (value: any) => value?.toFixed(2) || '0.00',
    },
    {
      title: '币制',
      dataIndex: 'currency',
      width: 80,
      render: (value: any, _record: any, index: number) => (
        <Input
          value={value}
          onChange={(e) => handleUpdateItem(index, 'currency', e.target.value)}
          placeholder="币制"
        />
      ),
    },
    {
      title: '原产国',
      dataIndex: 'countryOfOrigin',
      width: 100,
      render: (value: any, _record: any, index: number) => (
        <Input
          value={value}
          onChange={(e) => handleUpdateItem(index, 'countryOfOrigin', e.target.value)}
          placeholder="原产国"
        />
      ),
    },
    {
      title: '税率(%)',
      dataIndex: 'dutyRate',
      width: 80,
      render: (value: any, _record: any, index: number) => (
        <InputNumber
          value={value}
          onChange={(v) => handleUpdateItem(index, 'dutyRate', v || 0)}
          min={0}
          max={100}
          precision={2}
          className="w-full"
        />
      ),
    },
    {
      title: '操作',
      width: 60,
      fixed: 'right' as const,
      render: (_: any, _record: any, index: number) => (
        <Button
          type="link"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteItem(index)}
        />
      ),
    },
  ];

  const hasDeclarations = task.declarations && task.declarations.length > 0;
  const canExtract = !hasDeclarations || (hasDeclarations && task.declarations[0]?.confidenceScore === 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-medium">申报要素编辑</h3>
        <Space>
          <Button
            type={canExtract ? "primary" : "default"}
            icon={<CheckOutlined />}
            onClick={handleAIExtract}
            loading={extracting}
          >
            {hasDeclarations ? '重新 AI 提取' : 'AI 智能提取'}
          </Button>
          <Button icon={<SaveOutlined />} onClick={handleSave}>
            保存草稿
          </Button>
          <Button icon={<CheckOutlined />} onClick={handleGenerateExcel}>
            生成报关单
          </Button>
        </Space>
      </div>

      <Card title="表头信息" className="mb-4">
        <Form form={form} layout="inline">
          <Form.Item label="预录入编号" name="preEntryNo">
            <Input placeholder="预录入编号" />
          </Form.Item>
          <Form.Item label="海关编号" name="customsNo">
            <Input placeholder="海关编号" />
          </Form.Item>
          <Form.Item label="境内收发货人" name="domesticConsignee">
            <Input placeholder="境内收发货人" />
          </Form.Item>
          <Form.Item label="境外收发货人" name="overseasConsignee">
            <Input placeholder="境外收发货人" />
          </Form.Item>
          <Form.Item label="申报单位" name="declarant">
            <Input placeholder="申报单位" />
          </Form.Item>
          <Form.Item label="运输方式" name="transportMode">
            <Input placeholder="运输方式" />
          </Form.Item>
          <Form.Item label="运输工具名称" name="vesselName">
            <Input placeholder="船名" />
          </Form.Item>
          <Form.Item label="航次号" name="voyageNo">
            <Input placeholder="航次号" />
          </Form.Item>
          <Form.Item label="提单号" name="billNo">
            <Input placeholder="提单号" />
          </Form.Item>
          <Form.Item label="贸易国别" name="tradeCountry">
            <Input placeholder="贸易国别" />
          </Form.Item>
          <Form.Item label="装货港" name="portOfLoading">
            <Input placeholder="装货港" />
          </Form.Item>
          <Form.Item label="卸货港" name="portOfDischarge">
            <Input placeholder="卸货港" />
          </Form.Item>
          <Form.Item label="进境口岸" name="portOfEntry">
            <Input placeholder="进境口岸" />
          </Form.Item>
          <Form.Item label="运抵国" name="destinationCountry">
            <Input placeholder="运抵国" />
          </Form.Item>
          <Form.Item label="贸易方式" name="tradeMode">
            <Input placeholder="贸易方式" />
          </Form.Item>
          <Form.Item label="征免性质" name="taxMode">
            <Input placeholder="征免性质" />
          </Form.Item>
          <Form.Item label="毛重(KG)" name="grossWeight">
            <InputNumber min={0} placeholder="毛重" />
          </Form.Item>
          <Form.Item label="净重(KG)" name="netWeight">
            <InputNumber min={0} placeholder="净重" />
          </Form.Item>
          <Form.Item label="件数" name="packageCount">
            <InputNumber min={0} placeholder="件数" />
          </Form.Item>
          <Form.Item label="包装种类" name="packageType">
            <Input placeholder="包装种类" />
          </Form.Item>
          <Form.Item label="集装箱号" name="containerNo">
            <Input placeholder="集装箱号" />
          </Form.Item>
          <Form.Item label="币制" name="tradeCurrency">
            <Input placeholder="币制" />
          </Form.Item>
          <Form.Item label="总价" name="totalPrice">
            <InputNumber min={0} precision={2} placeholder="总价" />
          </Form.Item>
          <Form.Item label="发票号" name="invoiceNo">
            <Input placeholder="发票号" />
          </Form.Item>
          <Form.Item label="发票日期" name="invoiceDate">
            <Input placeholder="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item label="合同号" name="contractNo">
            <Input placeholder="合同号" />
          </Form.Item>
          <Form.Item label="备注" name="notes">
            <Input placeholder="备注" />
          </Form.Item>
        </Form>
      </Card>

      <Card
        title="商品明细"
        extra={
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={handleAddItem}
          >
            添加商品
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={items}
          rowKey={(record, index) => index ?? 0}
          pagination={false}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
}
