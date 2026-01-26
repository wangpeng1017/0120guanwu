/**
 * 文件上传 API
 * POST /api/upload
 *
 * 功能：
 * 1. 接收上传的文件
 * 2. 验证文件类型和大小
 * 3. 上传到阿里云 OSS 或本地存储
 * 4. 保存文件记录到数据库（演示模式使用内存存储）
 */

import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToOSS } from '@/lib/oss';
import { FileType, ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/constants';

// 文件类型映射（中文名称 -> 枚举值）
const FILE_TYPE_MAP: Record<string, FileType> = {
  '提单': 'BILL_OF_LADING',
  '发票': 'COMMERCIAL_INVOICE',
  '装箱单': 'PACKING_LIST',
  '合同': 'CONTRACT',
  '原产地证': 'CERTIFICATE',
  '保险单': 'OTHER',
  '3C证书': 'OTHER',
  '入库单': 'OTHER',
  '出境备案清单': 'OTHER',
  '许可证': 'OTHER',
  '核注清单': 'BONDED_NOTE',
  '手册': 'OTHER',
  '加工贸易合同': 'OTHER',
  '报关单': 'CUSTOMS_DECLARATION',
  '进境备案清单': 'OTHER',
  '出口退税联': 'OTHER',
  '转仓单': 'OTHER',
  '出口核注清单': 'BONDED_NOTE',
  '进口保税核注清单': 'BONDED_NOTE',
  '检验检疫证书': 'OTHER',
};

// 演示模式：内存存储（无数据库时使用）
const demoMaterials = new Map<string, any[]>();
const demoTasks = new Map<string, any>();

// 初始化演示任务数据
function initDemoTask(taskId: string) {
  if (!demoTasks.has(taskId)) {
    demoTasks.set(taskId, {
      id: taskId,
      taskNo: `DEMO-${taskId.toUpperCase()}`,
      status: 'DRAFT',
      createdAt: new Date(),
    });
    demoMaterials.set(taskId, []);
  }
}

/**
 * 根据文件名推断文件类型
 */
function inferFileType(fileName: string): FileType {
  const name = fileName.toLowerCase();

  if (name.includes('bill') || name.includes('提单') || name.includes('b/l')) {
    return 'BILL_OF_LADING';
  }
  if (name.includes('invoice') || name.includes('发票') || name.includes('inv')) {
    return 'COMMERCIAL_INVOICE';
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
  if (name.includes('报关单') || name.includes('customs') || name.includes('declaration')) {
    return 'CUSTOMS_DECLARATION';
  }
  if (name.includes('核注清单')) {
    return 'BONDED_NOTE';
  }

  return 'OTHER';
}

/**
 * 检查是否为演示模式
 */
async function isDemoMode(): Promise<boolean> {
  try {
    // 尝试导入 Prisma
    const prismaModule = await import('@/lib/prisma');
    // 检查是否配置了 DATABASE_URL
    return !process.env.DATABASE_URL;
  } catch (error) {
    // Prisma 未初始化，使用演示模式
    return true;
  }
}

export async function POST(request: NextRequest) {
  const demoMode = await isDemoMode();

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

    // 验证或创建任务
    console.log('[Upload API] taskId:', taskId, 'demoMode:', demoMode);

    if (demoMode) {
      // 演示模式：初始化内存任务
      initDemoTask(taskId);
    } else {
      // 生产模式：验证任务是否存在
      const prisma = (await import('@/lib/prisma')).default;
      let task = await prisma.task.findUnique({
        where: { id: taskId },
      });

      // 如果任务不存在且 taskId 是 "demo"，自动创建一个临时任务
      if (!task && taskId === 'demo') {
        console.log('[Upload API] 自动创建演示任务');
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
          });
          console.log('[Upload API] 演示任务创建成功:', task.id);
        } catch (createError) {
          // 可能是并发创建冲突，再次尝试查询
          console.log('[Upload API] 创建任务失败，尝试重新查询:', createError);
          task = await prisma.task.findUnique({
            where: { id: taskId },
          });
        }
      }

      if (!task) {
        console.log('[Upload API] 任务不存在:', taskId);
        return NextResponse.json(
          { success: false, error: '任务不存在' },
          { status: 404 }
        );
      }

      console.log('[Upload API] 任务验证通过:', task.id);
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
    let materialType: FileType;
    if (fileTypeParam && FILE_TYPE_MAP[fileTypeParam]) {
      materialType = FILE_TYPE_MAP[fileTypeParam];
    } else {
      materialType = inferFileType(file.name);
    }

    // 上传到 OSS 或本地存储
    const { storedName, fileUrl } = await uploadFileToOSS(buffer, file.name, materialType);

    // 生成文件 ID
    const materialId = `mat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 创建材料记录
    const material = {
      id: materialId,
      taskId,
      materialType,
      originalName: file.name,
      storedName,
      fileUrl,
      fileSize: file.size,
      mimeType: file.type,
      createdAt: new Date(),
    };

    if (demoMode) {
      // 演示模式：保存到内存
      const materials = demoMaterials.get(taskId) || [];
      materials.push(material);
      demoMaterials.set(taskId, materials);

      console.log(`[演示模式] 文件上传成功: ${file.name} -> ${fileUrl}`);
    } else {
      // 生产模式：保存到数据库
      const prisma = (await import('@/lib/prisma')).default;
      const dbMaterial = await prisma.material.create({
        data: material,
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
            materialType,
            fileSize: file.size,
          },
        },
      });

      material.id = dbMaterial.id;
      material.createdAt = dbMaterial.createdAt;
    }

    return NextResponse.json({
      success: true,
      demoMode, // 标识是否为演示模式
      material: {
        id: material.id,
        materialType: material.materialType,
        fileType: material.materialType, // 兼容旧字段
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
  const demoMode = await isDemoMode();

  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: '缺少任务ID' },
        { status: 400 }
      );
    }

    let materials: any[];

    if (demoMode) {
      // 演示模式：从内存获取
      materials = demoMaterials.get(taskId) || [];
    } else {
      // 生产模式：从数据库获取
      const prisma = (await import('@/lib/prisma')).default;
      materials = await prisma.material.findMany({
        where: { taskId },
        orderBy: { createdAt: 'asc' },
      });
    }

    return NextResponse.json({
      success: true,
      demoMode,
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
  const demoMode = await isDemoMode();

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少文件ID' },
        { status: 400 }
      );
    }

    if (demoMode) {
      // 演示模式：从内存删除
      for (const [taskId, materials] of demoMaterials.entries()) {
        const index = materials.findIndex(m => m.id === id);
        if (index !== -1) {
          const material = materials[index];
          materials.splice(index, 1);
          demoMaterials.set(taskId, materials);

          // 删除存储文件
          const { deleteFileFromOSS } = await import('@/lib/oss');
          await deleteFileFromOSS(material.storedName);

          console.log(`[演示模式] 文件删除成功: ${material.originalName}`);
          return NextResponse.json({
            success: true,
            demoMode,
            message: '文件删除成功',
          });
        }
      }

      return NextResponse.json(
        { success: false, error: '文件不存在' },
        { status: 404 }
      );
    } else {
      // 生产模式：从数据库删除
      const prisma = (await import('@/lib/prisma')).default;
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
    }
  } catch (error) {
    console.error('删除文件失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '删除文件失败' },
      { status: 500 }
    );
  }
}
