import { Task, DeclarationHeader, DeclarationItem, Material, FileType } from '@/types';

// 生成模拟任务数据
export function generateMockTasks(): Task[] {
  return [];
}

// 生成模拟申报数据
export function generateMockDeclaration(): {
  header: Partial<DeclarationHeader>;
  items: DeclarationItem[];
} {
  return {
    header: {
      preEntryNo: 'ED2025011900001',
      customsNo: '',
      domesticConsignee: '境内收发货人名称',
      overseasConsignee: '境外收发货人名称',
      declarant: '申报单位',
      transportMode: '水路运输',
      vesselName: '船名',
      voyageNo: '航次号',
      billNo: '提单号',
      tradeCountry: '贸易国别',
      portOfLoading: '装货港',
      portOfDischarge: '卸货港',
      portOfEntry: '进境口岸',
      destinationCountry: '运抵国',
      tradeMode: '一般贸易',
      taxMode: '照章征税',
      natureOfTax: '',
      grossWeight: 1000,
      netWeight: 900,
      packageCount: 10,
      packageType: '纸箱',
      containerNo: '集装箱号',
      tradeCurrency: 'USD',
      totalPrice: 10000,
      invoiceNo: '发票号',
      invoiceDate: '2025-01-19',
      contractNo: '合同号',
      notes: '',
    },
    items: [
      {
        itemNo: 1,
        goodsName: '商品名称',
        specs: '规格型号',
        hsCode: 'HS编码',
        quantity: 100,
        unit: '个',
        unitPrice: 50,
        totalPrice: 5000,
        currency: 'USD',
        countryOfOrigin: '原产国',
        dutyRate: 5,
        vatRate: 13,
        notes: '',
      },
    ],
  };
}
