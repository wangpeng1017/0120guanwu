// 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 格式化日期
export function formatDate(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// 获取文件扩展名
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

// 根据文件名识别文件类型
export function identifyFileType(filename: string): string {
  const name = filename.toLowerCase();

  // 提单
  if (name.includes('bill') || name.includes('提单') || name.includes('b/l')) {
    return '提单';
  }
  // 发票
  if (name.includes('invoice') || name.includes('发票')) {
    return '发票';
  }
  // 装箱单
  if (name.includes('packing') || name.includes('装箱单') || name.includes('箱单')) {
    return '装箱单';
  }
  // 合同
  if (name.includes('contract') || name.includes('合同')) {
    return '合同';
  }
  // 原产地证
  if (name.includes('origin') || name.includes('原产地')) {
    return '原产地证';
  }
  // 保险单
  if (name.includes('insurance') || name.includes('保险')) {
    return '保险单';
  }
  // 核注清单
  if (name.includes('核注清单') || name.includes('verification')) {
    return '核注清单';
  }
  // 报关单
  if (name.includes('报关单') || name.includes('customs') || name.includes('declaration')) {
    return '报关单';
  }
  // 备案清单
  if (name.includes('备案清单') || name.includes('record')) {
    return '备案清单';
  }
  // 手册
  if (name.includes('手册') || name.includes('handbook')) {
    return '手册';
  }
  // 3C证书
  if (name.includes('3c') || name.includes('ccc')) {
    return '3C证书';
  }
  // 许可证
  if (name.includes('许可') || name.includes('license')) {
    return '许可证';
  }

  return '其他';
}

// 生成下载文件名
export function generateDownloadFileName(originalName: string, fileType: string, taskNo: string): string {
  const ext = getFileExtension(originalName);
  return `${fileType}_${taskNo}.${ext}`;
}

// 验证文件
export function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 50 * 1024 * 1024; // 50MB
  const acceptedTypes = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.jpg', '.jpeg', '.png', '.tiff', '.zip', '.rar'];

  if (file.size > maxSize) {
    return { valid: false, error: '文件大小不能超过 50MB' };
  }

  const ext = '.' + getFileExtension(file.name);
  if (!acceptedTypes.includes(ext)) {
    return { valid: false, error: '不支持的文件类型' };
  }

  return { valid: true };
}
