/**
 * 文件上传 API
 * POST /api/upload
 *
 * 功能：
 * 1. 接收上传的文件
 * 2. 验证文件类型和大小
 * 3. 上传到阿里云 OSS 或本地存储
 * 4. 保存文件记录到数据库
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { uploadFileToOSS } from '@/lib/oss';
import { FileType, ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/constants';

// 文件类型映射（中文名称 -> 枚举值）
const FILE_TYPE_MAP: Record<string, FileType> = {
  '提单': 'BILL_OF_LADING',
  '发票': 'INVOICE',
  '装箱单': 'PACKING_LIST',
  '合同': 'CONTRACT',
  '原产地证': 'CERTIFICATE',
  '保险单': 'OTHER',
  '3C证书': 'OTHER',
  '入库单': 'OTHER',
  '出境备案清单': 'OTHER',
  '许可证': 'OTHER',
  '核注清单': 'OTHER',
  '手册': 'OTHER',
  '加工贸易合同': 'OTHER',
  '报关单': 'OTHER',
  '进境备案清单': 'OTHER',
  '出口退税联': 'OTHER',
  '转仓单': 'OTHER',
  '出口核注清单': 'OTHER',
  '进口保税核注清单': 'OTHER',
  '检验检疫证书': 'OTHER',
};

/**
 * 根据文件名推断文件类型
 */
function inferFileType(fileName: string): FileType {
  const name = fileName.toLowerCase();

  if (name.includes('bill') || name.includes('提单') || name.includes('b/l')) {
    return 'BILL_OF_LADING';
  }
  if (name.includes('invoice') || name.includes('发票') || name.includes('inv')) {
    return 'INVOICE';
  }
  if (name.includes('packing') || name.includes('装箱单') || name.includes('pl')) {
    return 'PACKING_LIST';
  }
  if (name.includes('contract') || name.includes('合同') || name.includes('ct')) {
    return 'CONTRACT';
  }
  if (name.includes('certificate') || name.includes('原产地证')) {
    return 'CERTIFICATE';
  }

  return 'OTHER';
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const taskId = formData.get('taskId') as string;
    const fileTypeParam = formData.get('fileType') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: '未选择文件' },
        { status: 400 }
      );
    }

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: '缺少任务ID' },
        { status: 400 }
      );
    }

    // 验证任务是否存在
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: '任务不存在' },
        { status: 404 }
      );
    }

    // 验证文件大小（50MB 限制）
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `文件大小超过限制（最大 ${MAX_FILE_SIZE / 1024 / 1024}MB）` },
        { status: 400 }
      );
    }

    // 验证文件类型
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_FILE_TYPES.includes(fileExtension)) {
      return NextResponse.json(
        { success: false, error: `不支持的文件类型：${fileExtension}` },
        { status: 400 }
      );
    }

    // 将文件转换为 Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 确定文件类型
    let fileType: FileType;
    if (fileTypeParam && FILE_TYPE_MAP[fileTypeParam]) {
      fileType = FILE_TYPE_MAP[fileTypeParam];
    } else {
      fileType = inferFileType(file.name);
    }

    // 上传到 OSS
    const { storedName, fileUrl } = await uploadFileToOSS(buffer, file.name, fileType);

    // 保存到数据库
    const material = await prisma.material.create({
      data: {
        taskId,
        fileType,
        originalName: file.name,
        storedName,
        fileUrl,
        fileSize: file.size,
        mimeType: file.type,
      },
    });

    // 更新任务状态
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'UPLOADING' },
    });

    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        taskId,
        action: 'upload',
        details: {
          fileName: file.name,
          fileType,
          fileSize: file.size,
        },
      },
    });

    return NextResponse.json({
      success: true,
      material: {
        id: material.id,
        fileType: material.fileType,
        originalName: material.originalName,
        fileUrl: material.fileUrl,
        fileSize: material.fileSize,
        createdAt: material.createdAt,
      },
    });
  } catch (error) {
    console.error('文件上传失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '文件上传失败' },
      { status: 500 }
    );
  }
}

/**
 * 获取文件列表
 * GET /api/upload?taskId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: '缺少任务ID' },
        { status: 400 }
      );
    }

    const materials = await prisma.material.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      success: true,
      materials,
    });
  } catch (error) {
    console.error('获取文件列表失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '获取文件列表失败' },
      { status: 500 }
    );
  }
}

/**
 * 删除文件
 * DELETE /api/upload?id=xxx
 */
export async function DELETE(request: NextRequest) {
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
    const material = await prisma.material.findUnique({
      where: { id },
    });

    if (!material) {
      return NextResponse.json(
        { success: false, error: '文件不存在' },
        { status: 404 }
      );
    }

    // 从 OSS 删除文件
    const { deleteFileFromOSS } = await import('@/lib/oss');
    await deleteFileFromOSS(material.storedName);

    // 从数据库删除记录
    await prisma.material.delete({
      where: { id },
    });

    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        taskId: material.taskId,
        action: 'delete',
        details: {
          fileName: material.originalName,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: '文件删除成功',
    });
  } catch (error) {
    console.error('删除文件失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '删除文件失败' },
      { status: 500 }
    );
  }
}
