/**
 * @file delegation-validation.ts
 * @desc 电子代理报关委托书验证逻辑
 * @input 依赖: @/types (DelegationInfo)
 * @output 导出: validateDelegationInfo, isDelegationRequired, calculateValidUntil
 * @see PRD: docs/PRD.md
 */

import type { DelegationInfo } from '@/types';

// ============================================================
// 类型定义
// ============================================================

export interface DelegationValidationResult {
  isValid: boolean;
  errors: string[];
}

// ============================================================
// 合法的有效期值
// ============================================================

const VALID_PERIODS = ['3', '6', '9', '12'] as const;
const VALID_MODES = ['SINGLE', 'LONG_TERM'] as const;

// 需要委托书的业务类型
const DELEGATION_REQUIRED_TYPES = [
  'PORT_IMPORT',
  'PORT_EXPORT',
  'FIRST_IMPORT',
  'FIRST_EXPORT',
  'SECOND_IN',
  'SECOND_OUT',
  'TRANSFER',
];

// 日期格式正则: YYYY-MM-DD
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// ============================================================
// isDelegationRequired - 判断业务类型是否需要委托书
// ============================================================

export function isDelegationRequired(businessType: string): boolean {
  if (!businessType) return false;
  return DELEGATION_REQUIRED_TYPES.includes(businessType);
}

// ============================================================
// validateDelegationInfo - 验证委托书信息
// ============================================================

export function validateDelegationInfo(info: DelegationInfo): DelegationValidationResult {
  const errors: string[] = [];

  // null/undefined 检查
  if (!info) {
    return { isValid: false, errors: ['委托书信息不能为空'] };
  }

  // 委托方企业海关编码
  if (!info.clientCompanyCode) {
    errors.push('委托方企业海关编码不能为空');
  }

  // 被委托方企业海关编码
  if (!info.agentCompanyCode) {
    errors.push('被委托方企业海关编码不能为空');
  }

  // 委托关系有效期
  if (!info.validityPeriod) {
    errors.push('委托关系有效期必须选择');
  } else if (!VALID_PERIODS.includes(info.validityPeriod as any)) {
    errors.push('委托关系有效期必须为3、6、9或12个月');
  }

  // 委托方式
  if (!info.delegationMode) {
    errors.push('委托方式必须选择');
  }

  // 委托内容
  if (!info.delegationContent || !Array.isArray(info.delegationContent) || info.delegationContent.length === 0) {
    errors.push('委托内容至少选择一项');
  }

  // 签订日期
  if (!info.signDate) {
    errors.push('签订日期必须填写');
  } else if (!DATE_REGEX.test(info.signDate)) {
    errors.push('签订日期格式不正确，应为YYYY-MM-DD');
  }

  // 有效截止日期
  if (!info.validUntil) {
    errors.push('有效截止日期必须填写');
  } else if (info.signDate && info.validUntil && DATE_REGEX.test(info.signDate) && DATE_REGEX.test(info.validUntil)) {
    if (new Date(info.validUntil) < new Date(info.signDate)) {
      errors.push('有效截止日期不能早于签订日期');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================
// calculateValidUntil - 根据签订日期和有效期月数计算截止日期
// ============================================================

export function calculateValidUntil(
  signDate: string,
  periodMonths: '3' | '6' | '9' | '12'
): string {
  if (!signDate || !periodMonths) return '';

  const months = parseInt(periodMonths, 10);
  if (isNaN(months)) return '';

  const date = new Date(signDate);
  if (isNaN(date.getTime())) return '';

  date.setMonth(date.getMonth() + months);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
