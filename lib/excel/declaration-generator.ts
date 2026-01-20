/**
 * Excel 报关单生成服务
 * 用于生成标准的报关单 Excel 文件
 */

import ExcelJS from 'exceljs';
import { DeclarationHeader, DeclarationItem } from '@/types';

interface GenerateOptions {
  templateType?: 'import' | 'export' | 'transfer';
  includeWatermark?: boolean;
}

/**
 * 生成进口报关单 Excel
 */
export async function generateImportDeclarationExcel(
  header: DeclarationHeader,
  items: DeclarationItem[],
  options: GenerateOptions = {}
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('进口报关单');

  // 设置列宽
  worksheet.columns = [
    { width: 15 }, { width: 20 }, { width: 15 }, { width: 15 },
    { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 },
    { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 },
    { width: 15 }, { width: 15 },
  ];

  // 标题行
  worksheet.mergeCells('A1:N1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = '中华人民共和国海关进口货物报关单';
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.font = { size: 16, bold: true };
  worksheet.getRow(1).height = 30;

  // 预录入编号和海关编号
  worksheet.getCell('A2').value = '预录入编号:';
  worksheet.getCell('B2').value = header.preEntryNo || '';
  worksheet.getCell('M2').value = '海关编号:';
  worksheet.getCell('N2').value = header.customsNo || '';

  // 表头信息（分两行显示）
  const headerFields1: Array<{ label: string; value: string; col: number }> = [
    { label: '境内收发货人', value: header.domesticConsignee, col: 1 },
    { label: '境外收发货人', value: header.overseasConsignee, col: 4 },
    { label: '申报单位', value: header.declarant, col: 7 },
    { label: '运输方式', value: header.transportMode, col: 10 },
  ];

  const headerFields2: Array<{ label: string; value: string; col: number }> = [
    { label: '运输工具名称', value: header.vesselName, col: 1 },
    { label: '航次号', value: header.voyageNo, col: 3 },
    { label: '提单号', value: header.billNo, col: 5 },
    { label: '贸易国别', value: header.tradeCountry, col: 7 },
    { label: '装货港', value: header.portOfLoading, col: 9 },
    { label: '卸货港', value: header.portOfDischarge, col: 11 },
    { label: '进境口岸', value: header.portOfEntry, col: 13 },
  ];

  const headerFields3: Array<{ label: string; value: string; col: number }> = [
    { label: '贸易方式', value: header.tradeMode, col: 1 },
    { label: '征免性质', value: header.taxMode, col: 3 },
    { label: '征免方式', value: header.natureOfTax, col: 5 },
    { label: '毛重(KG)', value: String(header.grossWeight || ''), col: 7 },
    { label: '净重(KG)', value: String(header.netWeight || ''), col: 9 },
    { label: '件数', value: String(header.packageCount || ''), col: 11 },
    { label: '包装种类', value: header.packageType, col: 13 },
  ];

  const headerFields4: Array<{ label: string; value: string; col: number }> = [
    { label: '集装箱号', value: header.containerNo, col: 1 },
    { label: '随附单证', value: '', col: 4 },
    { label: '币制', value: header.tradeCurrency, col: 7 },
    { label: '总价', value: String(header.totalPrice || ''), col: 9 },
    { label: '发票号', value: header.invoiceNo, col: 11 },
    { label: '发票日期', value: header.invoiceDate, col: 13 },
  ];

  // 设置表头字段（合并3列）
  const setFieldRow = (row: number, fields: Array<{ label: string; value: string; col: number }>) => {
    fields.forEach(field => {
      const startCol = field.col;
      const endCol = field.col + 2;
      worksheet.mergeCells(row, startCol, row, endCol);

      const labelCell = worksheet.getCell(row, startCol);
      labelCell.value = `${field.label}: ${field.value}`;
      labelCell.alignment = { vertical: 'middle' };
    });
  };

  setFieldRow(3, headerFields1);
  setFieldRow(4, headerFields2);
  setFieldRow(5, headerFields3);
  setFieldRow(6, headerFields4);

  // 表体表头
  const headerRow = 8;
  const tableHeaders = [
    '项号',
    '商品名称',
    '规格型号',
    'HS编码',
    '数量',
    '单位',
    '单价',
    '总价',
    '币制',
    '原产国',
    '税率(%)',
    '增值税率(%)',
    '备注',
  ];

  tableHeaders.forEach((headerText, index) => {
    const cell = worksheet.getCell(headerRow, index + 1);
    cell.value = headerText;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' },
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // 商品明细数据
  items.forEach((item, index) => {
    const row = headerRow + index + 1;
    const values = [
      item.itemNo,
      item.goodsName,
      item.specs,
      item.hsCode,
      item.quantity,
      item.unit,
      item.unitPrice,
      item.totalPrice,
      item.currency,
      item.countryOfOrigin,
      item.dutyRate,
      item.vatRate,
      item.notes,
    ];

    values.forEach((value, colIndex) => {
      const cell = worksheet.getCell(row, colIndex + 1);
      cell.value = value;
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // 设置行高
    worksheet.getRow(row).height = 25;
  });

  // 备注信息
  const lastRow = headerRow + items.length + 1;
  worksheet.mergeCells(lastRow, 1, lastRow, 14);
  const notesCell = worksheet.getCell(lastRow, 1);
  notesCell.value = `备注: ${header.notes || ''}`;
  notesCell.alignment = { vertical: 'top', wrapText: true };
  worksheet.getRow(lastRow).height = 40;

  // 生成 Buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * 生成出口报关单 Excel
 */
export async function generateExportDeclarationExcel(
  header: DeclarationHeader,
  items: DeclarationItem[],
  options: GenerateOptions = {}
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('出口报关单');

  // 设置列宽
  worksheet.columns = [
    { width: 15 }, { width: 20 }, { width: 15 }, { width: 15 },
    { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 },
    { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 },
    { width: 15 }, { width: 15 },
  ];

  // 标题行
  worksheet.mergeCells('A1:N1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = '中华人民共和国海关出口货物报关单';
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.font = { size: 16, bold: true };
  worksheet.getRow(1).height = 30;

  // 预录入编号和海关编号
  worksheet.getCell('A2').value = '预录入编号:';
  worksheet.getCell('B2').value = header.preEntryNo || '';
  worksheet.getCell('M2').value = '海关编号:';
  worksheet.getCell('N2').value = header.customsNo || '';

  // 表头信息
  const headerFields1: Array<{ label: string; value: string; col: number }> = [
    { label: '境内收发货人', value: header.domesticConsignee, col: 1 },
    { label: '境外收发货人', value: header.overseasConsignee, col: 4 },
    { label: '申报单位', value: header.declarant, col: 7 },
    { label: '运输方式', value: header.transportMode, col: 10 },
  ];

  const setFieldRow = (row: number, fields: Array<{ label: string; value: string; col: number }>) => {
    fields.forEach(field => {
      const startCol = field.col;
      const endCol = field.col + 2;
      worksheet.mergeCells(row, startCol, row, endCol);

      const labelCell = worksheet.getCell(row, startCol);
      labelCell.value = `${field.label}: ${field.value}`;
      labelCell.alignment = { vertical: 'middle' };
    });
  };

  setFieldRow(3, headerFields1);

  // 表体表头
  const headerRow = 5;
  const tableHeaders = [
    '项号',
    '商品名称',
    '规格型号',
    'HS编码',
    '数量',
    '单位',
    '单价',
    '总价',
    '币制',
    '最终目的国',
    '税率(%)',
    '增值税率(%)',
    '备注',
  ];

  tableHeaders.forEach((headerText, index) => {
    const cell = worksheet.getCell(headerRow, index + 1);
    cell.value = headerText;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' },
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // 商品明细数据
  items.forEach((item, index) => {
    const row = headerRow + index + 1;
    const values = [
      item.itemNo,
      item.goodsName,
      item.specs,
      item.hsCode,
      item.quantity,
      item.unit,
      item.unitPrice,
      item.totalPrice,
      item.currency,
      header.destinationCountry || item.countryOfOrigin, // 使用运抵国或原产国
      item.dutyRate,
      item.vatRate,
      item.notes,
    ];

    values.forEach((value, colIndex) => {
      const cell = worksheet.getCell(row, colIndex + 1);
      cell.value = value;
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    worksheet.getRow(row).height = 25;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * 生成报关单 Excel（根据类型自动选择）
 */
export async function generateDeclarationExcel(
  header: DeclarationHeader,
  items: DeclarationItem[],
  options: GenerateOptions = {}
): Promise<{ buffer: Buffer; fileName: string }> {
  const templateType = options.templateType || 'import';

  let buffer: Buffer;
  let fileName: string;

  if (templateType === 'export') {
    buffer = await generateExportDeclarationExcel(header, items, options);
    fileName = `出口报关单_${header.preEntryNo || new Date().getTime()}.xlsx`;
  } else {
    buffer = await generateImportDeclarationExcel(header, items, options);
    fileName = `进口报关单_${header.preEntryNo || new Date().getTime()}.xlsx`;
  }

  return { buffer, fileName };
}
