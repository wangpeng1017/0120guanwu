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
            bondedZoneType: 'FIRST_IMPORT',
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
      console.log('[Tasks API] 任务不存在:', id);
      return NextResponse.json(
        { success: false, error: '任务不存在' },
        { status: 404 }
      );
    }

    console.log('[Tasks API] 返回任务, materials:', task.materials?.length || 0);
    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error) {
    console.error('获取任务详情失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '获取任务详情失败' },
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

    // 检查任务是否存在
    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return NextResponse.json(
        { success: false, error: '任务不存在' },
        { status: 404 }
      );
    }

    // 更新任务
    const task = await prisma.task.update({
      where: { id },
      data: {
        ...body,
        updatedAt: new Date(),
      },
    });

    // 记录操作日志
    if (body.status) {
      await prisma.operationLog.create({
        data: {
          taskId: id,
          action: 'update',
          details: {
            status: body.status,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error) {
    console.error('更新任务失败:', error);
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

    // 检查任务是否存在
    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return NextResponse.json(
        { success: false, error: '任务不存在' },
        { status: 404 }
      );
    }

    // 删除任务（级联删除关联的材料、申报要素、生成的文件、操作日志）
    await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: '任务删除成功',
    });
  } catch (error) {
    console.error('删除任务失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '删除任务失败' },
      { status: 500 }
    );
  }
}
