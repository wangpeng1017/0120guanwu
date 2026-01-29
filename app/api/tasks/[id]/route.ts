
/**
 * 单个任务管理 API
 * GET /api/tasks/[id] - 获取任务详情
 * PUT /api/tasks/[id] - 更新任务
 * DELETE /api/tasks/[id] - 删除任务
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * 获取任务详情
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    console.log('[Tasks API] 获取任务详情, id:', id);

    let task = await prisma.task.findUnique({
      where: { id },
      include: {
        materials: {
          orderBy: { createdAt: 'asc' },
        },
        declarations: {
          orderBy: { createdAt: 'desc' },
        },
        generatedFiles: {
          orderBy: { createdAt: 'desc' },
        },
        operationLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // 如果任务不存在且 id 是 "demo"，自动创建一个演示任务
    if (!task && id === 'demo') {
      console.log('[Tasks API] 自动创建演示任务');
      try {
        task = await prisma.task.create({
          data: {
            id: 'demo',
            taskNo: 'DEMO-001',
            businessCategory: 'BONDED_ZONE',
            businessType: 'BONDED_ZONE_FIRST_IMPORT',
            bondedZoneType: 'BONDED_ZONE_FIRST_IMPORT',
            status: 'DRAFT',
          },
          include: {
            materials: true,
            declarations: true,
            generatedFiles: true,
            operationLogs: true,
          },
        });
        console.log('[Tasks API] 演示任务创建成功:', task.id);
      } catch (createError) {
        console.log('[Tasks API] 创建任务失败，尝试重新查询:', createError);
        task = await prisma.task.findUnique({
          where: { id },
          include: {
            materials: {
              orderBy: { createdAt: 'asc' },
            },
            declarations: {
              orderBy: { createdAt: 'desc' },
            },
            generatedFiles: {
              orderBy: { createdAt: 'desc' },
            },
            operationLogs: {
              orderBy: { createdAt: 'desc' },
            },
          },
        });
      }
    }

    if (!task) {
      console.error('[Tasks API] 任务不存在');
      return NextResponse.json(
        { success: false, error: '任务不存在' },
        { status: 404 }
      );
    }

    console.log('[Tasks API] 返回任务详情');
    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error) {
    console.error('[Tasks API] 获取任务失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '获取任务失败' },
      { status: 500 }
    );
  }
}

/**
 * 更新任务
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    console.log('[Tasks API] 更新任务, id:', id);

    const updated = await prisma.task.update({
      where: { id },
      data: body,
    });

    console.log('[Tasks API] 任务更新成功');
    return NextResponse.json({
      success: true,
      task: updated,
    });
  } catch (error) {
    console.error('[Tasks API] 更新任务失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '更新任务失败' },
      { status: 500 }
    );
  }
}

/**
 * 删除任务
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    console.log('[Tasks API] 删除任务, id:', id);

    // 先删除关联数据
    await prisma.operationLog.deleteMany({ where: { taskId: id } });
    await prisma.generatedFile.deleteMany({ where: { taskId: id } });
    await prisma.declaration.deleteMany({ where: { taskId: id } });
    await prisma.material.deleteMany({ where: { taskId: id } });

    // 再删除任务
    await prisma.task.delete({ where: { id } });

    console.log('[Tasks API] 任务删除成功');
    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('[Tasks API] 删除任务失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '删除任务失败' },
      { status: 500 }
    );
  }
}
