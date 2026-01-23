/**
 * AI 提取 API
 * POST /api/extract
 *
 * 功能：
 * 1. 获取任务的所有材料
 * 2. 解析文件内容（PDF/Excel/图片）
 * 3. 调用 GLM-4.7 提取申报要素
 * 4. 保存提取结果到数据库
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { extractDeclaration } from '@/lib/ai/declaration-extractor';
import { parseFromUrl } from '@/lib/parsers';

/**
 * 执行 AI 提取
 */
export async function POST(request: NextRequest) {
  console.log('[API:extract] 收到提取请求');

  try {
    const body = await request.json();
    const { taskId } = body;

    console.log('[API:extract] 任务ID:', taskId);

    if (!taskId) {
      console.error('[API:extract] 缺少任务ID');
      return NextResponse.json(
        { success: false, error: '缺少任务ID' },
        { status: 400 }
      );
    }

    // 获取任务的所有材料
    console.log('[API:extract] 查询任务材料...');
    const materials = await prisma.material.findMany({
      where: { taskId },
    });

    console.log('[API:extract] 找到材料数量:', materials.length);
    materials.forEach((m, i) => {
      console.log(`[API:extract] 材料${i + 1}:`, {
        id: m.id,
        originalName: m.originalName,
        materialType: m.materialType,
        mimeType: m.mimeType,
        fileUrl: m.fileUrl,
        hasExtractedData: !!m.extractedData,
      });
    });

    if (materials.length === 0) {
      console.error('[API:extract] 没有找到材料');
      return NextResponse.json(
        { success: false, error: '请先上传报关材料' },
        { status: 400 }
      );
    }

    // 更新任务状态为提取中
    console.log('[API:extract] 更新任务状态为 EXTRACTING');
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'EXTRACTING' },
    });

    // 准备材料数据，解析文件内容
    console.log('[API:extract] 开始解析材料内容...');
    const materialsData = await Promise.all(
      materials.map(async (m, index) => {
        console.log(`[API:extract] 解析材料 ${index + 1}/${materials.length}: ${m.originalName}`);
        let content: string | undefined;

        // 如果之前已经提取过数据，直接使用
        if (m.extractedData) {
          console.log(`[API:extract] 材料 ${m.originalName} 已有提取数据，直接使用`);
          content = typeof m.extractedData === 'string'
            ? m.extractedData
            : JSON.stringify(m.extractedData);
        } else {
          // 否则解析文件
          try {
            console.log(`[API:extract] 调用 parseFromUrl:`, {
              fileUrl: m.fileUrl,
              mimeType: m.mimeType,
              originalName: m.originalName,
              storedName: m.storedName,
            });
            const parseResult = await parseFromUrl(m.fileUrl, m.mimeType, m.originalName, m.storedName);
            content = parseResult.text;
            console.log(`[API:extract] 材料 ${m.originalName} 解析成功，内容长度:`, content?.length || 0);

            // 保存解析结果到数据库，避免重复解析
            await prisma.material.update({
              where: { id: m.id },
              data: { extractedData: content },
            });
            console.log(`[API:extract] 材料 ${m.originalName} 解析结果已保存`);
          } catch (parseError) {
            console.error(`[API:extract] 解析文件 ${m.originalName} 失败:`, parseError);
            content = `[解析失败: ${m.originalName}]`;
          }
        }

        const result = {
          materialType: m.materialType,
          originalName: m.originalName,
          fileUrl: m.fileUrl,
          content,
        };
        console.log(`[API:extract] 材料 ${m.originalName} 处理完成，内容长度:`, content?.length || 0);
        return result;
      })
    );

    // 调试日志
    console.log('[API:extract] 材料处理完成，总数:', materialsData.length);
    materialsData.forEach((m, i) => {
      console.log(`[API:extract] 材料 ${i + 1}: ${m.originalName}, 内容长度: ${m.content?.length || 0}`);
    });

    // 执行 AI 提取
    console.log('[API:extract] 开始调用 AI 提取...');
    const extracted = await extractDeclaration(materialsData);
    console.log('[API:extract] AI 提取完成，结果:', {
      hasHeader: !!extracted.header,
      itemsCount: extracted.items?.length || 0,
      overallConfidence: extracted.overallConfidence,
    });

    // 计算整体置信度
    const overallConfidence =
      extracted.overallConfidence ||
      calculateConfidence(extracted);

    console.log('[API:extract] 计算置信度:', overallConfidence);

    // 保存提取结果
    console.log('[API:extract] 保存提取结果到数据库...');
    const declaration = await prisma.declaration.create({
      data: {
        taskId,
        headerData: extracted.header,
        bodyData: extracted.items,
        confidenceScore: overallConfidence,
        extractionMethod: 'ai-vision', // AI 视觉提取
        isConfirmed: false,
      },
    });
    console.log('[API:extract] 申报数据已保存，ID:', declaration.id);

    // 更新任务状态为编辑中
    console.log('[API:extract] 更新任务状态为 EDITING');
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'EDITING',
        // 如果提取到了预录入编号，也保存
        preEntryNo: extracted.header?.preEntryNo?.value
          ? String(extracted.header.preEntryNo.value)
          : null,
      },
    });

    // 记录操作日志
    console.log('[API:extract] 记录操作日志...');
    await prisma.operationLog.create({
      data: {
        taskId,
        action: 'extract',
        details: {
          confidenceScore: overallConfidence,
          itemsCount: extracted.items.length,
        },
      },
    });
    console.log('[API:extract] 操作日志已记录');

    console.log('[API:extract] 提取成功，返回结果');
    return NextResponse.json({
      success: true,
      declaration,
      extracted,
    });
  } catch (error) {
    console.error('[API:extract] 发生错误:', error);
    console.error('[API:extract] 错误堆栈:', error instanceof Error ? error.stack : 'No stack trace');

    // 更新任务状态为失败
    if (request.method === 'POST') {
      try {
        const body = await request.json();
        if (body.taskId) {
          console.log('[API:extract] 更新任务状态为 FAILED');
          await prisma.task.update({
            where: { id: body.taskId },
            data: { status: 'FAILED' },
          });
        }
      } catch (e) {
        console.error('[API:extract] 更新失败状态时出错:', e);
        // 忽略错误
      }
    }

    console.error('[API:extract] 返回错误响应');
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'AI 提取失败',
      },
      { status: 500 }
    );
  }
}

/**
 * 计算置信度（备用方法）
 */
function calculateConfidence(extracted: {
  header: Record<string, { value: string | number; confidence: number; source: string }>;
  items: Array<Record<string, { value: string | number; confidence: number; source: string }>>;
  overallConfidence?: number;
}): number {
  if (extracted.overallConfidence) {
    return extracted.overallConfidence;
  }

  const headerValues = Object.values(extracted.header);
  const itemValues = extracted.items.flatMap(Object.values);

  const allConfidences = [...headerValues, ...itemValues]
    .map(v => v.confidence)
    .filter(c => c > 0);

  if (allConfidences.length === 0) return 0;

  const sum = allConfidences.reduce((a, b) => a + b, 0);
  return sum / allConfidences.length;
}
