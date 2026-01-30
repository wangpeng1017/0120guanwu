/**
 * @file DelegationSection.tsx
 * @desc 电子代理报关委托书表单区域组件
 * @input 依赖: antd, @/types (DelegationInfo, DELEGATION_CONTENT_OPTIONS)
 * @output 导出: DelegationSection
 * @see PRD: docs/PRD.md
 */

'use client';

import React from 'react';
import { Card, Input, Select, Checkbox, DatePicker } from 'antd';
import type { DelegationInfo } from '@/types';
import {
  DELEGATION_CONTENT_OPTIONS,
  VALIDITY_PERIOD_OPTIONS,
  DELEGATION_MODE_OPTIONS,
} from '@/types';
import { calculateValidUntil } from '@/lib/delegation-validation';

// ============================================================
// 类型定义
// ============================================================

interface DelegationSectionProps {
  value: DelegationInfo;
  onChange: (value: DelegationInfo) => void;
  disabled?: boolean;
}

// ============================================================
// 委托关系状态中文映射
// ============================================================

const STATUS_LABELS: Record<string, string> = {
  INITIATED: '已发起',
  CONFIRMED: '已确认',
  REJECTED: '已拒绝',
  EXPIRED: '已过期',
  TERMINATED: '已终止',
};

// ============================================================
// 组件实现
// ============================================================

export function DelegationSection({ value, onChange, disabled = false }: DelegationSectionProps) {
  const handleFieldChange = (field: keyof DelegationInfo, fieldValue: unknown) => {
    const updated = { ...value, [field]: fieldValue };

    // 如果修改了签订日期或有效期，自动计算截止日期
    if (field === 'signDate' || field === 'validityPeriod') {
      const signDate = field === 'signDate' ? (fieldValue as string) : value.signDate;
      const period = field === 'validityPeriod' ? (fieldValue as '3' | '6' | '9' | '12') : value.validityPeriod;
      if (signDate && period) {
        updated.validUntil = calculateValidUntil(signDate, period);
      }
    }

    onChange(updated);
  };

  const allReadonly = disabled;

  return (
    <Card title="代理报关委托书" className="mb-4">
      {/* 委托方信息 */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-600 mb-2">委托方信息</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">企业海关编码</label>
            <Input
              value={value.clientCompanyCode}
              readOnly
              className="bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">企业名称</label>
            <Input
              value={value.clientCompanyName}
              readOnly
              className="bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">统一社会信用代码</label>
            <Input
              value={value.clientCreditCode}
              readOnly
              className="bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">法人代表授权签署人</label>
            <Input
              value={value.clientAuthorizedPerson}
              readOnly
              className="bg-gray-50"
            />
          </div>
        </div>
      </div>

      {/* 被委托方信息 */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-600 mb-2">被委托方信息</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">企业海关编码</label>
            <Input
              value={value.agentCompanyCode}
              readOnly
              className="bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">企业名称</label>
            <Input
              value={value.agentCompanyName}
              readOnly
              className="bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">统一社会信用代码</label>
            <Input
              value={value.agentCreditCode}
              readOnly
              className="bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">法人代表授权签署人</label>
            <Input
              value={value.agentAuthorizedPerson}
              readOnly
              className="bg-gray-50"
            />
          </div>
        </div>
      </div>

      {/* 委托关系信息（可编辑） */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-600 mb-2">委托关系信息</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">委托关系有效期</label>
            <Select
              value={value.validityPeriod}
              onChange={(v) => handleFieldChange('validityPeriod', v)}
              options={VALIDITY_PERIOD_OPTIONS.map((opt) => ({ label: opt.label, value: opt.value }))}
              className="w-full"
              disabled={allReadonly}
              placeholder="请选择有效期"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">委托方式</label>
            <Select
              value={value.delegationMode}
              onChange={(v) => handleFieldChange('delegationMode', v)}
              options={DELEGATION_MODE_OPTIONS.map((opt) => ({ label: opt.label, value: opt.value }))}
              className="w-full"
              disabled={allReadonly}
              placeholder="请选择委托方式"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">签订日期</label>
            <Input
              value={value.signDate}
              onChange={(e) => handleFieldChange('signDate', e.target.value)}
              placeholder="YYYY-MM-DD"
              readOnly={allReadonly}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">有效截止日期</label>
            <Input
              value={value.validUntil}
              onChange={(e) => handleFieldChange('validUntil', e.target.value)}
              placeholder="YYYY-MM-DD"
              readOnly={allReadonly}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs text-gray-500 mb-1">委托内容</label>
          <Checkbox.Group
            value={value.delegationContent}
            onChange={(checkedValues) => handleFieldChange('delegationContent', checkedValues)}
            disabled={allReadonly}
          >
            <div className="flex flex-wrap gap-4">
              {DELEGATION_CONTENT_OPTIONS.map((option) => (
                <Checkbox key={option} value={option}>
                  {option}
                </Checkbox>
              ))}
            </div>
          </Checkbox.Group>
        </div>
      </div>

      {/* 状态信息（只读） */}
      <div>
        <h4 className="text-sm font-medium text-gray-600 mb-2">状态信息</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">委托书编号</label>
            <Input
              value={value.delegationNo || ''}
              readOnly
              placeholder="系统自动生成"
              className="bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">委托关系状态</label>
            <Input
              value={value.delegationStatus ? (STATUS_LABELS[value.delegationStatus] || value.delegationStatus) : ''}
              readOnly
              placeholder="待确认"
              className="bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">委托协议份数</label>
            <Input
              value={value.agreementCount !== undefined ? String(value.agreementCount) : ''}
              readOnly
              placeholder="系统自动生成"
              className="bg-gray-50"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
