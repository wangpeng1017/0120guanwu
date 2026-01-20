/**
 * 任务管理 API
 * POST /api/tasks - 创建新任务
 * GET /api/tasks - 获取任务列表
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { BusinessDirection, SupervisionLevel, TradeMode } from '@prisma/client';

/**
 * 生成任务编号
 * 格式: GW202501200001
 */
function generateTaskNo(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
  return `GW${year}${month}${day}${random}`;
}

/**
 * 创建新任务
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessDirection, supervisionLevel, tradeMode } = body as {
      businessDirection: BusinessDirection;
      supervisionLevel: SupervisionLevel;
      tradeMode: TradeMode;
    };

    // 验证参数
    if (!businessDirection || !supervisionLevel || !tradeMode) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 生成任务编号
    const taskNo = generateTaskNo();

    // 创建任务
    const task = await prisma.task.create({
      data: {
        taskNo,
        businessDirection,
        supervisionLevel,
        tradeMode,
        status: 'DRAFT',
      },
    });

    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        taskId: task.id,
        action: 'create',
        details: {
          businessDirection,
          supervisionLevel,
          tradeMode,
        },
      },
    });

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error) {
    console.error('创建任务失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '创建任务失败' },
      { status: 500 }
    );
  }
}

/**
 * 获取任务列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const businessDirection = searchParams.get('businessDirection');

    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (businessDirection) {
      where.businessDirection = businessDirection;
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          materials: true,
          declarations: true,
          _count: {
            select: {
              materials: true,
              generatedFiles: true,
            },
          },
        },
      }),
      prisma.task.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取任务列表失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '获取任务列表失败' },
      { status: 500 }
    );
  }
}
