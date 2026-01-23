/**
 * 报关单生成和下载 API
 * POST /api/generate - 生成报关单 Excel
 * GET /api/generate?id=xxx - 下载已生成的文件
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateDeclarationExcel } from '@/lib/excel/declaration-generator';

/**
 * 生成报关单 Excel
 */
export async function POST(request: NextRequest) {
  try {
    const { declarationId, taskId, templateType } = await request.json();

    if (!declarationId && !taskId) {
      return NextResponse.json(
        { success: false, error: '缺少申报ID或任务ID' },
        { status: 400 }
      );
    }

    // 获取申报数据
    let declaration;
    if (declarationId) {
      declaration = await prisma.declaration.findUnique({
        where: { id: declarationId },
        include: { task: true },
      });
    } else {
      declaration = await prisma.declaration.findFirst({
        where: { taskId },
        include: { task: true },
      });
    }

    if (!declaration) {
      return NextResponse.json(
        { success: false, error: '未找到申报数据' },
        { status: 404 }
      );
    }

    // 更新任务状态
    await prisma.task.update({
      where: { id: declaration.taskId },
      data: { status: 'GENERATING' },
    });

    // 从 JSON 数据中提取表头和表体
    const headerData = declaration.headerData as Record<string, any>;
    const bodyData = declaration.bodyData as Array<Record<string, any>>;

    // 转换数据格式
    const header = {
      preEntryNo: headerData.preEntryNo?.value || '',
      customsNo: headerData.customsNo?.value || '',
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

    const items = bodyData.map(item => ({
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

    // 确定模板类型（从 businessCategory 和 businessType 推断）
    const businessCategory = declaration.task?.businessCategory || 'BONDED_ZONE';
    const businessType = declaration.task?.businessType || '';

    // 根据业务类型推断方向（EXPORT/IMPORT）
    const isExport = businessType.includes('EXPORT') || businessType.includes('SECOND_OUT') || businessType.includes('TRANSFER');
    const finalTemplateType = templateType || (isExport ? 'export' : 'import');

    // 生成 Excel
    const { buffer, fileName } = await generateDeclarationExcel(header, items, {
      templateType: finalTemplateType,
    });

    // 保存到本地或 OSS（这里简化处理）
    const fs = require('fs');
    const path = require('path');
    const downloadsDir = path.join(process.cwd(), 'public', 'downloads');

    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    const storedFileName = `${Date.now()}_${fileName}`;
    const filePath = path.join(downloadsDir, storedFileName);
    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/downloads/${storedFileName}`;

    // 保存生成的文件记录
    const generatedFile = await prisma.generatedFile.create({
      data: {
        taskId: declaration.taskId,
        fileType: finalTemplateType,
        fileName,
        fileUrl,
      },
    });

    // 更新任务状态为已完成
    await prisma.task.update({
      where: { id: declaration.taskId },
      data: { status: 'COMPLETED' },
    });

    // 标记申报要素为已确认
    await prisma.declaration.update({
      where: { id: declaration.id },
      data: { isConfirmed: true },
    });

    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        taskId: declaration.taskId,
        action: 'generate',
        details: {
          fileName,
          fileType: finalTemplateType,
        },
      },
    });

    return NextResponse.json({
      success: true,
      generatedFile: {
        id: generatedFile.id,
        fileName,
        fileUrl,
        downloadUrl: `/api/generate?id=${generatedFile.id}`,
      },
    });
  } catch (error) {
    console.error('生成报关单失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '生成报关单失败' },
      { status: 500 }
    );
  }
}

/**
 * 下载已生成的文件
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少文件ID' },
        { status: 400 }
      );
    }

    // 获取文件记录
    const generatedFile = await prisma.generatedFile.findUnique({
      where: { id },
    });

    if (!generatedFile) {
      return NextResponse.json(
        { success: false, error: '文件不存在' },
        { status: 404 }
      );
    }

    // 增加下载计数
    await prisma.generatedFile.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });

    // 读取文件
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(process.cwd(), 'public', generatedFile.fileUrl);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: '文件已被删除' },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(filePath);

    // 返回文件
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(generatedFile.fileName)}"`,
      },
    });
  } catch (error) {
    console.error('下载文件失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '下载文件失败' },
      { status: 500 }
    );
  }
}
