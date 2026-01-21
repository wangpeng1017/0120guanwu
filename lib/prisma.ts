/**
 * Prisma 客户端实例
 * 用于数据库操作
 */

import { PrismaClient } from '@prisma/client';

// 声明全局类型以支持热重载
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// 创建 Prisma 客户端实例
// 在开发环境中使用全局变量避免热重载时创建多个实例
const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
