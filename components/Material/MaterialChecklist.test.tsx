/**
 * MaterialChecklist 组件测试
 * TDD: RED - 先写测试
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MaterialChecklist } from './MaterialChecklist';
import { Material } from '@/types';

// Mock 配置
vi.mock('@/lib/material-config', () => ({
  getRequiredMaterials: (businessType: string) => {
    if (businessType === 'BONDED_ZONE_FIRST_IMPORT') {
      return {
        required: [
          { type: 'BILL_OF_LADING', name: '提单', minCount: 1 },
          { type: 'COMMERCIAL_INVOICE', name: '商业发票', minCount: 1 },
          { type: 'PACKING_LIST', name: '装箱单', minCount: 1 },
          { type: 'BONDED_NOTE', name: '核注清单', minCount: 1 },
        ],
        optional: [
          { type: 'CONTRACT', name: '合同' },
        ],
      };
    }
    return { required: [], optional: [] };
  },
}));

describe('MaterialChecklist', () => {
  const mockMaterials: Material[] = [
    {
      id: '1',
      taskId: 'task-1',
      materialType: 'BILL_OF_LADING',
      originalName: '提单.pdf',
      storedName: 'bol.pdf',
      fileUrl: '/uploads/bol.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf',
      createdAt: new Date(),
    },
    {
      id: '2',
      taskId: 'task-1',
      materialType: 'PACKING_LIST',
      originalName: '装箱单.pdf',
      storedName: 'pl.pdf',
      fileUrl: '/uploads/pl.pdf',
      fileSize: 2048,
      mimeType: 'application/pdf',
      createdAt: new Date(),
    },
  ];

  it('应该显示材料清单标题和进度', () => {
    render(
      <MaterialChecklist
        businessType="BONDED_ZONE_FIRST_IMPORT"
        uploadedMaterials={mockMaterials}
      />
    );

    expect(screen.getByText('材料清单')).toBeInTheDocument();
    expect(screen.getByText('2/4 必填材料')).toBeInTheDocument();
  });

  it('应该显示必填材料列表', () => {
    render(
      <MaterialChecklist
        businessType="BONDED_ZONE_FIRST_IMPORT"
        uploadedMaterials={mockMaterials}
      />
    );

    expect(screen.getByText('提单')).toBeInTheDocument();
    expect(screen.getByText('商业发票')).toBeInTheDocument();
    expect(screen.getByText('装箱单')).toBeInTheDocument();
    expect(screen.getByText('核注清单')).toBeInTheDocument();
  });

  it('应该显示可选材料列表', () => {
    render(
      <MaterialChecklist
        businessType="BONDED_ZONE_FIRST_IMPORT"
        uploadedMaterials={mockMaterials}
      />
    );

    expect(screen.getByText('合同')).toBeInTheDocument();
  });

  it('应该正确标记已上传的材料', () => {
    render(
      <MaterialChecklist
        businessType="BONDED_ZONE_FIRST_IMPORT"
        uploadedMaterials={mockMaterials}
      />
    );

    // 提单已上传
    const billOfLadingItems = screen.getAllByText('提单');
    const billOfLading = billOfLadingItems.find(el =>
      el.textContent?.includes('已上传')
    );
    expect(billOfLading).toBeInTheDocument();

    // 装箱单已上传
    const packingListItems = screen.getAllByText('装箱单');
    const packingList = packingListItems.find(el =>
      el.textContent?.includes('已上传')
    );
    expect(packingList).toBeInTheDocument();
  });

  it('应该显示未上传材料的待上传状态', () => {
    render(
      <MaterialChecklist
        businessType="BONDED_ZONE_FIRST_IMPORT"
        uploadedMaterials={mockMaterials}
      />
    );

    // 商业发票未上传
    const invoiceItems = screen.getAllByText('商业发票');
    const invoice = invoiceItems.find(el =>
      el.textContent?.includes('待上传')
    );
    expect(invoice).toBeInTheDocument();

    // 核注清单未上传
    const noteItems = screen.getAllByText('核注清单');
    const note = noteItems.find(el =>
      el.textContent?.includes('待上传')
    );
    expect(note).toBeInTheDocument();
  });

  it('应该显示正确的进度百分比', () => {
    const { container } = render(
      <MaterialChecklist
        businessType="BONDED_ZONE_FIRST_IMPORT"
        uploadedMaterials={mockMaterials}
      />
    );

    // 2/4 = 50%
    const progressBar = container.querySelector('.ant-progress');
    expect(progressBar).toBeInTheDocument();
  });

  it('应该处理空材料列表', () => {
    render(
      <MaterialChecklist
        businessType="BONDED_ZONE_FIRST_IMPORT"
        uploadedMaterials={[]}
      />
    );

    expect(screen.getByText('0/4 必填材料')).toBeInTheDocument();
  });

  it('应该处理未知业务类型', () => {
    render(
      <MaterialChecklist
        businessType="UNKNOWN_TYPE"
        uploadedMaterials={[]}
      />
    );

    expect(screen.getByText('0/0 必填材料')).toBeInTheDocument();
  });
});
