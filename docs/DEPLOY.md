# 关务AI+RPA智能申报系统 - 部署文档

> 最后更新: 2026-01-29 | 版本: 1.0

---

## 一、部署环境概览

### 1.1 服务器信息

| 项目 | 配置 |
|------|------|
| **服务器IP** | 8.130.182.148 |
| **访问地址** | http://8.130.182.148:3005 |
| **操作系统** | CentOS/Alibaba Cloud Linux |
| **Node.js版本** | 18.x+ |
| **项目路径** | /root/guanwu-system（待确认） |
| **PM2进程名** | guanwu-app（待确认） |

### 1.2 依赖服务

| 服务 | 用途 | 状态 |
|------|------|------|
| **PostgreSQL** | 数据存储 | 需配置 |
| **阿里云 OSS** | 文件存储 | 需配置 |
| **智谱 AI** | AI 提取服务 | 需配置 |

---

## 二、环境变量配置

### 2.1 创建 .env 文件

在服务器项目根目录创建 `.env` 文件：

```bash
# ============================================================
# 数据库配置
# ============================================================
DATABASE_URL="postgresql://guanwu:password@localhost:5432/guanwu"

# ============================================================
# AI 服务配置（智谱 GLM-4.7）
# ============================================================
ZHIPUAI_API_KEY="your-zhipuai-api-key"

# ============================================================
# 阿里云 OSS 配置
# ============================================================
OSS_REGION="oss-cn-hangzhou"
OSS_ACCESS_KEY_ID="your-access-key-id"
OSS_ACCESS_KEY_SECRET="your-access-key-secret"
OSS_BUCKET="guanwu-files"

# ============================================================
# 应用配置
# ============================================================
NEXT_PUBLIC_APP_URL="http://8.130.182.148:3005"
```

### 2.2 安全提醒

⚠️ **禁止将 `.env` 文件提交到 Git**

```bash
# 确保 .gitignore 包含以下内容
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore
```

---

## 三、首次部署流程

### 3.1 服务器初始化

```bash
# 1. SSH 连接到服务器
ssh root@8.130.182.148

# 2. 安装 Node.js 18.x（如果未安装）
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 3. 安装 PM2
sudo npm install -g pm2

# 4. 安装 PostgreSQL（如果未安装）
sudo yum install -y postgresql postgresql-server
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 5. 创建数据库和用户
sudo -u postgres psql
CREATE DATABASE guanwu;
CREATE USER guanwu WITH PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE guanwu TO guanwu;
\q
```

### 3.2 部署项目代码

```bash
# 1. 克隆项目（如果尚未克隆）
cd /root
git clone https://github.com/wangpeng1017/0120guanwu.git guanwu-system
cd guanwu-system

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
vi .env  # 填写实际的配置信息

# 4. 同步数据库 Schema
npx prisma generate
npx prisma db push

# 5. 构建项目
npm run build

# 6. 启动 PM2 进程
pm2 start npm --name "guanwu-app" -- start

# 7. 保存 PM2 配置
pm2 save
pm2 startup  # 执行输出的命令
```

### 3.3 配置防火墙（如需要）

```bash
# 开放 3005 端口
sudo firewall-cmd --permanent --add-port=3005/tcp
sudo firewall-cmd --reload

# 或使用 iptables
sudo iptables -I INPUT -p tcp --dport 3005 -j ACCEPT
sudo service iptables save
```

---

## 四、更新部署流程

当本地代码有更新时，执行以下流程：

### 4.1 标准更新步骤

```bash
# 1. 本地提交并推送代码
git add -A
git commit -m "feat: xxx"
git push

# 2. SSH 连接到服务器
ssh root@8.130.182.148

# 3. 进入项目目录
cd /root/guanwu-system

# 4. 拉取最新代码
git pull

# 5. 安装新依赖（如有）
npm install

# 6. 同步数据库 Schema（如有模型变更）
npx prisma generate
npx prisma db push

# 7. 重新构建并重启（后台执行避免 SSH 超时）
nohup sh -c 'npm run build && pm2 restart guanwu-app' > /tmp/build.log 2>&1 &

# 8. 等待构建完成后检查日志
tail -f /tmp/build.log
```

### 4.2 快速更新脚本

创建 `scripts/update.sh` 快捷更新脚本：

```bash
#!/bin/bash
set -e

echo "🔄 开始更新..."

# 拉取代码
echo "📥 拉取最新代码..."
git pull

# 安装依赖
echo "📦 安装依赖..."
npm install

# 数据库迁移
echo "🗄️ 同步数据库..."
npx prisma generate
npx prisma db push

# 构建
echo "🔨 构建项目..."
npm run build

# 重启服务
echo "🚀 重启服务..."
pm2 restart guanwu-app

echo "✅ 更新完成！"
pm2 status
```

使用方法：
```bash
chmod +x scripts/update.sh
./scripts/update.sh
```

---

## 五、PM2 常用命令

### 5.1 进程管理

```bash
# 查看所有进程
pm2 list

# 查看日志
pm2 logs guanwu-app

# 查看实时日志
pm2 logs guanwu-app --lines 100

# 重启服务
pm2 restart guanwu-app

# 停止服务
pm2 stop guanwu-app

# 删除服务
pm2 delete guanwu-app

# 监控
pm2 monit
```

### 5.2 日志管理

```bash
# 清空日志
pm2 flush

# 查看错误日志
pm2 logs guanwu-app --err

# 查看日志文件位置
pm2 show guanwu-app | grep log
```

---

## 六、数据库管理

### 6.1 Prisma 命令

```bash
# 生成 Prisma Client
npx prisma generate

# 同步 Schema（开发环境）
npx prisma db push

# 创建迁移（生产环境）
npx prisma migrate dev --name xxx

# 查看数据库
npx prisma studio
```

### 6.2 PostgreSQL 备份

```bash
# 备份数据库
pg_dump -U guanwu guanwu > backup_$(date +%Y%m%d).sql

# 恢复数据库
psql -U guanwu guanwu < backup_20260129.sql
```

---

## 七、故障排查

### 7.1 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| **端口被占用** | 3005 端口已被使用 | `pm2 stop guanwu-app` 或 `lsof -i:3005` |
| **数据库连接失败** | DATABASE_URL 配置错误 | 检查 `.env` 中的数据库连接字符串 |
| **构建失败** | 依赖安装不完整 | 删除 `node_modules` 重新安装 |
| **Prisma 错误** | Schema 未同步 | 运行 `npx prisma db push` |
| **OSS 上传失败** | OSS 配置错误 | 检查 OSS 相关环境变量 |

### 7.2 查看构建日志

```bash
# 查看最近的构建日志
cat /tmp/build.log | tail -50

# 查看当前运行日志
pm2 logs guanwu-app --lines 100
```

### 7.3 健康检查

```bash
# 检查服务是否运行
curl http://localhost:3005

# 检查端口监听
netstat -tlnp | grep 3005

# 检查 PM2 进程
pm2 status
```

---

## 八、部署检查清单

部署前必须检查：

- [ ] `.env` 文件已配置（包含数据库、OSS、AI API）
- [ ] PostgreSQL 数据库已创建
- [ ] Prisma Schema 已同步：`npx prisma db push`
- [ ] 构建成功：`npm run build`
- [ ] PM2 进程正常运行：`pm2 status`
- [ ] 防火墙已开放 3005 端口
- [ ] 外网可访问：http://8.130.182.148:3005

---

## 九、变更历史

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-01-29 | 1.0 | 初始版本，定义阿里云部署流程 |
