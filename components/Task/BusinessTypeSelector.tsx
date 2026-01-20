'use client';

import { useState, useEffect } from 'react';
import { Card, Radio, Space, Button, Typography, Divider, message } from 'antd';
import { BUSINESS_TYPES } from '@/lib/constants';
import { useRouter } from 'next/navigation';

const { Title, Paragraph } = Typography;

interface BusinessTypeSelectorProps {
  direction: 'import' | 'export' | 'transfer';
}

export function BusinessTypeSelector({ direction }: BusinessTypeSelectorProps) {
  const router = useRouter();
  const [selectedLevel, setSelectedLevel] = useState<'first' | 'second'>('first');
  const [selectedMode, setSelectedMode] = useState<'normal' | 'processing'>('normal');
  const [selectedType, setSelectedType] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // 过滤出对应方向的业务类型
  const availableTypes = Object.entries(BUSINESS_TYPES)
    .filter(([key, value]) => value.direction === direction)
    .map(([key, value]) => ({ key, ...value }));

  // 初始化时设置默认选中的业务类型
  useEffect(() => {
    updateSelectedType(selectedLevel, selectedMode);
  }, [direction]);

  const handleLevelChange = (e: any) => {
    setSelectedLevel(e.target.value);
    updateSelectedType(e.target.value, selectedMode);
  };

  const handleModeChange = (e: any) => {
    setSelectedMode(e.target.value);
    updateSelectedType(selectedLevel, e.target.value);
  };

  const updateSelectedType = (level: string, mode: string) => {
    const typeKey = `${direction}-${level}-${mode}`;
    if (BUSINESS_TYPES[typeKey as keyof typeof BUSINESS_TYPES]) {
      setSelectedType(typeKey);
    } else if (direction === 'transfer') {
      // 转仓只有转入转出
      const transferKey = level === 'first' ? 'transfer-out' : 'transfer-in';
      setSelectedType(transferKey);
    }
  };

  const handleConfirm = async () => {
    if (!selectedType) return;

    const typeInfo = BUSINESS_TYPES[selectedType as keyof typeof BUSINESS_TYPES];
    setLoading(true);

    try {
      // 映射到新的数据结构
      const businessDirection = direction === 'import' ? 'IMPORT' : direction === 'export' ? 'EXPORT' : 'TRANSFER';
      const supervisionLevel = selectedLevel === 'first' ? 'FIRST' : 'SECOND';
      const tradeMode = selectedMode === 'normal' ? 'GENERAL' : 'PROCESSING';

      // 调用 API 创建任务
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessDirection,
          supervisionLevel,
          tradeMode,
        }),
      });

      const result = await response.json();

      if (result.success) {
        message.success('任务创建成功');
        router.push(`/dashboard/tasks/${result.task.id}`);
      } else {
        message.error(result.error || '创建任务失败');
      }
    } catch (error) {
      console.error('创建任务失败:', error);
      message.error('创建任务失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentTypeInfo = () => {
    if (selectedType && BUSINESS_TYPES[selectedType as keyof typeof BUSINESS_TYPES]) {
      return BUSINESS_TYPES[selectedType as keyof typeof BUSINESS_TYPES];
    }
    return null;
  };

  const typeInfo = getCurrentTypeInfo();

  return (
    <div className="max-w-3xl mx-auto">
      <Space direction="vertical" size="large" className="w-full">
        {/* 业务方向说明 */}
        <div className="text-center">
          <Title level={3}>
            {direction === 'import' && '进口报关申报'}
            {direction === 'export' && '出口报关申报'}
            {direction === 'transfer' && '转仓申报'}
          </Title>
          <Paragraph className="text-gray-500">
            {direction === 'import' && '支持一线入区、二线出区等多种进口业务场景'}
            {direction === 'export' && '支持一线出区、二线进区等多种出口业务场景'}
            {direction === 'transfer' && '支持货物转出、转入等转仓业务'}
          </Paragraph>
        </div>

        <Divider />

        {/* 监管环节选择 */}
        <div>
          <Title level={5}>选择监管环节</Title>
          <Card className="bg-gray-50">
            <Radio.Group value={selectedLevel} onChange={handleLevelChange} className="w-full">
              <Space direction="vertical" className="w-full">
                <Radio value="first" className="w-full">
                  <div className="flex justify-between items-center pr-8">
                    <span className="font-medium">
                      {direction === 'import' ? '一线入区' : direction === 'export' ? '一线出区' : '转出'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {direction === 'import' && '货物直接进境报关'}
                      {direction === 'export' && '货物直接出境报关'}
                      {direction === 'transfer' && '货物转出仓库'}
                    </span>
                  </div>
                </Radio>
                <Radio value="second" className="w-full">
                  <div className="flex justify-between items-center pr-8">
                    <span className="font-medium">
                      {direction === 'import' ? '二线出区' : direction === 'export' ? '二线进区' : '转入'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {direction === 'import' && '保税货物进出区'}
                      {direction === 'export' && '货物进出监管区域'}
                      {direction === 'transfer' && '货物转入仓库'}
                    </span>
                  </div>
                </Radio>
              </Space>
            </Radio.Group>
          </Card>
        </div>

        {/* 贸易方式选择（转仓不显示） */}
        {direction !== 'transfer' && (
          <div>
            <Title level={5}>选择贸易方式</Title>
            <Card className="bg-gray-50">
              <Radio.Group value={selectedMode} onChange={handleModeChange} className="w-full">
                <Space direction="vertical" className="w-full">
                  <Radio value="normal" className="w-full">
                    <div className="flex justify-between items-center pr-8">
                      <span className="font-medium">一般贸易</span>
                      <span className="text-sm text-gray-500">标准进出口贸易，征税/退税</span>
                    </div>
                  </Radio>
                  <Radio value="processing" className="w-full">
                    <div className="flex justify-between items-center pr-8">
                      <span className="font-medium">加工贸易</span>
                      <span className="text-sm text-gray-500">保税进口、加工后出口</span>
                    </div>
                  </Radio>
                </Space>
              </Radio.Group>
            </Card>
          </div>
        )}

        {/* 当前选择说明 */}
        {typeInfo && (
          <Card className="bg-blue-50 border-blue-200">
            <Space direction="vertical" size="small">
              <div>
                <span className="text-gray-500">已选择：</span>
                <span className="font-medium ml-2">{typeInfo.name}</span>
              </div>
              <div className="text-sm text-gray-600">{typeInfo.description}</div>
            </Space>
          </Card>
        )}

        {/* 确认按钮 */}
        <div className="text-center pt-4">
          <Button
            type="primary"
            size="large"
            onClick={handleConfirm}
            disabled={!selectedType}
            loading={loading}
          >
            创建申报任务
          </Button>
        </div>
      </Space>
    </div>
  );
}
