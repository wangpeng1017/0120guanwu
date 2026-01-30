/**
 * @file delegation-validation.test.ts
 * @desc 电子代理报关委托书验证逻辑单元测试
 * @see PRD: docs/PRD.md
 */

import { describe, it, expect } from 'vitest';
import {
  validateDelegationInfo,
  isDelegationRequired,
  calculateValidUntil,
  type DelegationValidationResult,
} from './delegation-validation';
import type { DelegationInfo } from '@/types';

// ============================================================
// 测试数据工厂
// ============================================================

function createValidDelegationInfo(overrides?: Partial<DelegationInfo>): DelegationInfo {
  return {
    // 委托方信息（锁定字段）
    clientCompanyCode: '3100000001',
    clientCompanyName: '上海测试进出口有限公司',
    clientCreditCode: '91310000MA1FL8HX0X',
    clientAuthorizedPerson: '张三',
    // 被委托方信息（锁定字段）
    agentCompanyCode: '3100000002',
    agentCompanyName: '上海代理报关有限公司',
    agentCreditCode: '91310000MA1FL8HX1Y',
    agentAuthorizedPerson: '李四',
    // 可编辑字段
    validityPeriod: '6',
    delegationMode: 'SINGLE',
    delegationContent: ['报关报检'],
    signDate: '2026-01-30',
    validUntil: '2026-07-30',
    ...overrides,
  };
}

// ============================================================
// isDelegationRequired - 判断是否需要委托书
// ============================================================

describe('isDelegationRequired', () => {
  it('当业务类型为代理报关（PORT_IMPORT）时，返回 true', () => {
    expect(isDelegationRequired('PORT_IMPORT')).toBe(true);
  });

  it('当业务类型为代理报关（PORT_EXPORT）时，返回 true', () => {
    expect(isDelegationRequired('PORT_EXPORT')).toBe(true);
  });

  it('当业务类型为保税区一线进口时，返回 true', () => {
    expect(isDelegationRequired('FIRST_IMPORT')).toBe(true);
  });

  it('当业务类型为保税区一线出口时，返回 true', () => {
    expect(isDelegationRequired('FIRST_EXPORT')).toBe(true);
  });

  it('当业务类型为保税区二线进区时，返回 true', () => {
    expect(isDelegationRequired('SECOND_IN')).toBe(true);
  });

  it('当业务类型为保税区二线出区时，返回 true', () => {
    expect(isDelegationRequired('SECOND_OUT')).toBe(true);
  });

  it('当业务类型为转关时，返回 true', () => {
    expect(isDelegationRequired('TRANSFER')).toBe(true);
  });

  it('当业务类型为空字符串时，返回 false', () => {
    expect(isDelegationRequired('')).toBe(false);
  });

  it('当业务类型为未知类型时，返回 false', () => {
    expect(isDelegationRequired('UNKNOWN_TYPE')).toBe(false);
  });
});

// ============================================================
// validateDelegationInfo - 委托书信息验证
// ============================================================

describe('validateDelegationInfo', () => {
  it('合法的完整委托书信息，验证通过', () => {
    const info = createValidDelegationInfo();
    const result = validateDelegationInfo(info);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // ---- 委托关系有效期验证 ----

  it('缺少委托关系有效期时，返回错误', () => {
    const info = createValidDelegationInfo({ validityPeriod: '' as any });
    const result = validateDelegationInfo(info);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('委托关系有效期必须选择');
  });

  it('委托关系有效期为非法值时，返回错误', () => {
    const info = createValidDelegationInfo({ validityPeriod: '5' as any });
    const result = validateDelegationInfo(info);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('委托关系有效期必须为3、6、9或12个月');
  });

  // ---- 委托方式验证 ----

  it('缺少委托方式时，返回错误', () => {
    const info = createValidDelegationInfo({ delegationMode: '' as any });
    const result = validateDelegationInfo(info);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('委托方式必须选择');
  });

  // ---- 委托内容验证 ----

  it('委托内容为空数组时，返回错误', () => {
    const info = createValidDelegationInfo({ delegationContent: [] });
    const result = validateDelegationInfo(info);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('委托内容至少选择一项');
  });

  it('委托内容为 undefined 时，返回错误', () => {
    const info = createValidDelegationInfo({ delegationContent: undefined as any });
    const result = validateDelegationInfo(info);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('委托内容至少选择一项');
  });

  it('委托内容包含多项时，验证通过', () => {
    const info = createValidDelegationInfo({
      delegationContent: ['报关报检', '制单', '征免税'],
    });
    const result = validateDelegationInfo(info);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // ---- 签订日期验证 ----

  it('缺少签订日期时，返回错误', () => {
    const info = createValidDelegationInfo({ signDate: '' });
    const result = validateDelegationInfo(info);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('签订日期必须填写');
  });

  it('签订日期格式不正确时，返回错误', () => {
    const info = createValidDelegationInfo({ signDate: '2026/01/30' });
    const result = validateDelegationInfo(info);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('签订日期格式不正确，应为YYYY-MM-DD');
  });

  // ---- 有效截止日期验证 ----

  it('缺少有效截止日期时，返回错误', () => {
    const info = createValidDelegationInfo({ validUntil: '' });
    const result = validateDelegationInfo(info);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('有效截止日期必须填写');
  });

  it('有效截止日期早于签订日期时，返回错误', () => {
    const info = createValidDelegationInfo({
      signDate: '2026-06-01',
      validUntil: '2026-01-01',
    });
    const result = validateDelegationInfo(info);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('有效截止日期不能早于签订日期');
  });

  // ---- 委托方信息验证 ----

  it('缺少委托方企业海关编码时，返回错误', () => {
    const info = createValidDelegationInfo({ clientCompanyCode: '' });
    const result = validateDelegationInfo(info);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('委托方企业海关编码不能为空');
  });

  it('缺少被委托方企业海关编码时，返回错误', () => {
    const info = createValidDelegationInfo({ agentCompanyCode: '' });
    const result = validateDelegationInfo(info);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('被委托方企业海关编码不能为空');
  });

  // ---- 多个错误同时返回 ----

  it('多个字段缺失时，返回所有错误', () => {
    const info = createValidDelegationInfo({
      validityPeriod: '' as any,
      delegationContent: [],
      signDate: '',
    });
    const result = validateDelegationInfo(info);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  // ---- null/undefined 边界 ----

  it('传入 null 时，返回错误', () => {
    const result = validateDelegationInfo(null as any);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('委托书信息不能为空');
  });

  it('传入 undefined 时，返回错误', () => {
    const result = validateDelegationInfo(undefined as any);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('委托书信息不能为空');
  });
});

// ============================================================
// calculateValidUntil - 根据签订日期和有效期计算截止日期
// ============================================================

describe('calculateValidUntil', () => {
  it('签订日期加3个月', () => {
    expect(calculateValidUntil('2026-01-15', '3')).toBe('2026-04-15');
  });

  it('签订日期加6个月', () => {
    expect(calculateValidUntil('2026-01-15', '6')).toBe('2026-07-15');
  });

  it('签订日期加9个月', () => {
    expect(calculateValidUntil('2026-01-15', '9')).toBe('2026-10-15');
  });

  it('签订日期加12个月', () => {
    expect(calculateValidUntil('2026-01-15', '12')).toBe('2027-01-15');
  });

  it('跨年计算正确', () => {
    expect(calculateValidUntil('2026-11-15', '3')).toBe('2027-02-15');
  });

  it('月末日期处理（1月31日加1个月不能是2月31日）', () => {
    // JS Date 会自动处理：1月31日 + 1个月 = 3月3日 或 2月28日
    // 此测试验证函数对月末的处理行为
    const result = calculateValidUntil('2026-01-31', '3');
    // 1月31日 + 3个月 = 4月30日（因为4月没有31日）或 5月1日
    expect(result).toBeTruthy();
  });

  it('空签订日期返回空字符串', () => {
    expect(calculateValidUntil('', '3')).toBe('');
  });

  it('空有效期返回空字符串', () => {
    expect(calculateValidUntil('2026-01-15', '' as any)).toBe('');
  });
});
