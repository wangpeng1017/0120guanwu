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
  try {
    const { taskId } = await request.json();

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: '缺少任务ID' },
        { status: 400 }
      );
    }

    // 获取任务的所有材料
    const materials = await prisma.material.findMany({
      where: { taskId },
    });

    if (materials.length === 0) {
      return NextResponse.json(
        { success: false, error: '请先上传报关材料' },
        { status: 400 }
      );
    }

    // 更新任务状态为提取中
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'EXTRACTING' },
    });

    // 准备材料数据，解析文件内容
    const materialsData = await Promise.all(
      materials.map(async (m) => {
        let content: string | undefined;

        // 如果之前已经提取过数据，直接使用
        if (m.extractedData) {
          content = typeof m.extractedData === 'string'
            ? m.extractedData
            : JSON.stringify(m.extractedData);
        } else {
          // 否则解析文件
          try {
            const parseResult = await parseFromUrl(m.fileUrl, m.mimeType, m.originalName, m.storedName);
            content = parseResult.text;

            // 保存解析结果到数据库，避免重复解析
            await prisma.material.update({
              where: { id: m.id },
              data: { extractedData: content },
            });
          } catch (parseError) {
            console.error(`解析文件 ${m.originalName} 失败:`, parseError);
            content = `[解析失败: ${m.originalName}]`;
          }
        }

        return {
          fileType: m.fileType,
          originalName: m.originalName,
          fileUrl: m.fileUrl,
          content,
        };
      })
    );

    // 调试日志
    console.log('[AI提取] 材料数量:', materialsData.length);
    materialsData.forEach((m, i) => {
      console.log(`[AI提取] 材料 ${i + 1}: ${m.originalName}, 内容长度: ${m.content?.length || 0}`);
    });

    // 执行 AI 提取
    const extracted = await extractDeclaration(materialsData);

    // 计算整体置信度
    const overallConfidence =
      extracted.overallConfidence ||
      calculateConfidence(extracted);

    // 保存提取结果
    const declaration = await prisma.declaration.create({
      data: {
        taskId,
        headerData: extracted.header,
        bodyData: extracted.items,
        confidenceScore: overallConfidence,
        isConfirmed: false,
      },
    });

    // 更新任务状态为编辑中
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

    return NextResponse.json({
      success: true,
      declaration,
      extracted,
    });
  } catch (error) {
    console.error('AI 提取失败:', error);

    // 更新任务状态为失败
    if (request.method === 'POST') {
      try {
        const body = await request.json();
        if (body.taskId) {
          await prisma.task.update({
            where: { id: body.taskId },
            data: { status: 'FAILED' },
          });
        }
      } catch (e) {
        // 忽略错误
      }
    }

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
