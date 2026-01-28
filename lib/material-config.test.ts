/**
 * 材料配置工具函数测试
 * TDD: RED - 先写测试
 */

import { describe, it, expect } from 'vitest';
import { getRequiredMaterials, getMaterialTypeLabel } from './material-config';

describe('getRequiredMaterials', () => {
  it('应该返回综保区一线进口的材料清单', () => {
    const result = getRequiredMaterials('BONDED_ZONE_FIRST_IMPORT');

    expect(result).toBeDefined();
    expect(result.required).toHaveLength(4);
    expect(result.optional).toHaveLength(1);

    // 验证必填材料
    expect(result.required).toContainEqual({
      type: 'BILL_OF_LADING',
      name: '提单',
      minCount: 1
    });
    expect(result.required).toContainEqual({
      type: 'COMMERCIAL_INVOICE',
      name: '商业发票',
      minCount: 1
    });
    expect(result.required).toContainEqual({
      type: 'PACKING_LIST',
      name: '装箱单',
      minCount: 1
    });
    expect(result.required).toContainEqual({
      type: 'BONDED_NOTE',
      name: '核注清单',
      minCount: 1
    });

    // 验证可选材料
    expect(result.optional).toContainEqual({
      type: 'CONTRACT',
      name: '合同'
    });
  });

  it('应该返回口岸进口的材料清单', () => {
    const result = getRequiredMaterials('PORT_IMPORT');

    expect(result.required).toHaveLength(4);
    expect(result.optional).toHaveLength(2);

    // 口岸进口需要合同
    expect(result.required).toContainEqual({
      type: 'CONTRACT',
      name: '合同',
      minCount: 1
    });
  });

  it('应该返回综保区二线出仓（一般贸易）的材料清单', () => {
    const result = getRequiredMaterials('BONDED_ZONE_SECOND_OUT_GENERAL');

    expect(result.required).toHaveLength(2); // 报关单 + 核注清单
    expect(result.optional).toHaveLength(3);

    expect(result.required).toContainEqual({
      type: 'CUSTOMS_DECLARATION',
      name: '报关单',
      minCount: 1
    });
  });

  it('应该返回综保区区内流转的材料清单（需要2份核注清单）', () => {
    const result = getRequiredMaterials('BONDED_ZONE_TRANSFER');

    expect(result.required).toHaveLength(1);
    expect(result.required[0].minCount).toBe(2); // 需要2份
  });

  it('对于未知业务类型，应该返回空数组', () => {
    const result = getRequiredMaterials('UNKNOWN_TYPE');

    expect(result.required).toEqual([]);
    expect(result.optional).toEqual([]);
  });

  it('对于空字符串，应该返回空数组', () => {
    const result = getRequiredMaterials('');

    expect(result.required).toEqual([]);
    expect(result.optional).toEqual([]);
  });
});

describe('getMaterialTypeLabel', () => {
  it('应该返回正确的中文标签', () => {
    expect(getMaterialTypeLabel('BILL_OF_LADING')).toBe('提单');
    expect(getMaterialTypeLabel('COMMERCIAL_INVOICE')).toBe('商业发票');
    expect(getMaterialTypeLabel('PACKING_LIST')).toBe('装箱单');
    expect(getMaterialTypeLabel('CONTRACT')).toBe('合同');
    expect(getMaterialTypeLabel('CUSTOMS_DECLARATION')).toBe('报关单');
    expect(getMaterialTypeLabel('BONDED_NOTE')).toBe('核注清单');
    expect(getMaterialTypeLabel('CERTIFICATE')).toBe('原产地证');
    expect(getMaterialTypeLabel('OTHER')).toBe('其他');
  });

  it('对于未知类型，应该返回原值', () => {
    expect(getMaterialTypeLabel('UNKNOWN')).toBe('UNKNOWN');
  });
});
