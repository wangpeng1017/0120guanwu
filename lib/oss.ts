/**
 * 阿里云 OSS 客户端
 * 用于文件上传和下载
 */

import OSS from 'ali-oss';
import { v4 as uuidv4 } from 'uuid';

// OSS 客户端实例（延迟初始化）
let ossClient: OSS | null = null;

/**
 * 获取 OSS 客户端实例
 */
export function getOSSClient(): OSS | null {
  if (!process.env.OSS_ACCESS_KEY_ID || !process.env.OSS_ACCESS_KEY_SECRET) {
    // 未配置 OSS 凭证，返回 null（用于本地开发）
    return null;
  }

  if (!ossClient) {
    ossClient = new OSS({
      region: process.env.OSS_REGION || 'oss-cn-hangzhou',
      accessKeyId: process.env.OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
      bucket: process.env.OSS_BUCKET || 'guanwu-files',
    });
  }

  return ossClient;
}

/**
 * 上传文件到 OSS
 * @param file 文件 Buffer
 * @param originalName 原始文件名
 * @param fileType 文件类型
 * @returns 上传后的文件信息
 */
export async function uploadFileToOSS(
  file: Buffer,
  originalName: string,
  fileType: string
): Promise<{
  storedName: string;
  fileUrl: string;
}> {
  const client = getOSSClient();

  // 生成唯一文件名
  const ext = originalName.split('.').pop() || '';
  const storedName = `${fileType}/${uuidv4()}.${ext}`;

  if (client) {
    // 使用阿里云 OSS
    await client.put(storedName, file);
    const fileUrl = `https://${process.env.OSS_BUCKET}.${process.env.OSS_REGION}.aliyuncs.com/${storedName}`;
    return { storedName, fileUrl };
  } else {
    // 本地开发模式：保存到 public/uploads
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', fileType);

    // 确保目录存在
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const localPath = path.join(uploadsDir, `${uuidv4()}.${ext}`);
    fs.writeFileSync(localPath, file);

    const fileUrl = `/uploads/${fileType}/${path.basename(localPath)}`;
    return { storedName: fileUrl, fileUrl };
  }
}

/**
 * 从 OSS 删除文件
 * @param storedName 存储的文件名
 */
export async function deleteFileFromOSS(storedName: string): Promise<void> {
  const client = getOSSClient();

  if (client) {
    await client.delete(storedName);
  } else {
    // 本地开发模式：删除本地文件
    const fs = require('fs');
    const path = require('path');
    const localPath = path.join(process.cwd(), 'public', storedName);

    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
  }
}

/**
 * 获取文件临时访问 URL
 * @param storedName 存储的文件名
 * @param expires 过期时间（秒），默认 1 小时
 */
export async function getFileSignedUrl(
  storedName: string,
  expires: number = 3600
): Promise<string> {
  const client = getOSSClient();

  if (client) {
    return client.signatureUrl(storedName, { expires });
  } else {
    // 本地开发模式：直接返回本地 URL
    return `${process.env.NEXT_PUBLIC_APP_URL}${storedName}`;
  }
}
