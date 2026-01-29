/**
 * 任务管理 API
 * POST /api/tasks - 创建新任务
 * GET /api/tasks - 获取任务列表
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
    const { businessCategory, businessType } = body as {
      businessCategory: 'BONDED_ZONE' | 'PORT' | 'GENERAL';
      businessType: string;
    };

    // 验证参数
    if (!businessCategory || !businessType) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 生成任务编号
    const taskNo = generateTaskNo();

    // 创建任务（使用新的业务类型结构）
    const task = await prisma.task.create({
      data: {
        taskNo,
        businessCategory: businessCategory as any, // 类型断言,待Prisma重新生成后移除
        businessType,
        bondedZoneType: businessCategory === 'BONDED_ZONE'
          ? (businessType as any)
          : null,
        portType: businessCategory === 'PORT'
          ? (businessType as any)
          : null,
        status: 'DRAFT',
      },
    });

    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        taskId: task.id,
        action: 'create',
        details: {
          businessCategory,
          businessType,
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
    const businessCategory = searchParams.get('businessCategory');

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (businessCategory) {
      where.businessCategory = businessCategory;
    }

    const [total, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          materials: {
            select: {
              id: true,
              originalName: true,
              materialType: true,
              fileSize: true,
              createdAt: true,
            },
          },
          declarations: {
            select: {
              id: true,
              confidenceScore: true,
              isConfirmed: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              materials: true,
              declarations: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        tasks,
        total,
        page,
        limit,
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
