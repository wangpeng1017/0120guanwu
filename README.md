# 关务AI+RPA智能申报系统

智能化关务申报辅助平台，支持进口、出口、转仓等多种业务场景的报关申报流程。

## 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **UI**: Ant Design + Tailwind CSS
- **状态管理**: Zustand
- **文件处理**: XLSX, JSZip
- **部署**: Vercel

## 功能特性

### 已实现功能

- **左侧导航 + 右侧内容区布局**
- **业务类型选择** (进口/出口/转仓 + 一线/二线 + 贸易方式)
- **材料清单提醒** (根据业务类型动态显示所需材料)
- **材料上传** (拖拽上传、预览、删除)
- **申报要素编辑** (表头信息 + 商品明细表格)
- **模拟AI智能提取** (演示用，使用预设数据)
- **Excel导出** (按单一窗口格式生成申报表格)
- **文件下载** (单个下载、批量打包下载、自动重命名)

### 业务流程

```
选择业务类型 -> 上传材料 -> AI提取要素 -> 编辑确认 -> 导出表格 -> 下载文件
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 本地开发

```bash
npm run dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
npm run build
npm start
```

## 部署到 Vercel

### 方法一：通过 Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录并部署
vercel
```

### 方法二：通过 Vercel 网站

1. 将代码推送到 GitHub
2. 在 Vercel 中导入项目
3. Vercel 会自动检测 Next.js 项目并进行部署

### 环境变量

Demo 版本无需配置环境变量。

## 项目结构

```
guanwu-system/
├── app/                      # Next.js App Router
│   ├── layout.tsx           # 根布局
│   ├── page.tsx             # 首页
│   ├── globals.css          # 全局样式
│   └── dashboard/           # 仪表盘
│       ├── layout.tsx       # 仪表盘布局
│       ├── page.tsx         # 控制台
│       ├── import/          # 进口申报
│       ├── export/          # 出口申报
│       ├── transfer/        # 转仓申报
│       ├── tasks/           # 任务管理
│       │   └── [id]/        # 任务详情
│       └── history/         # 历史记录
├── components/              # 组件
│   ├── Layout/              # 布局组件
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── DashboardLayout.tsx
│   ├── Task/                # 任务组件
│   │   └── BusinessTypeSelector.tsx
│   ├── Material/            # 材料组件
│   │   ├── MaterialChecklist.tsx
│   │   └── MaterialUpload.tsx
│   └── Declaration/         # 申报组件
│       ├── DeclarationForm.tsx
│       └── DownloadPanel.tsx
├── lib/                     # 工具库
│   ├── store.ts             # Zustand 状态管理
│   ├── types.ts             # 类型定义
│   ├── constants.ts         # 常量配置
│   ├── mockData.ts          # 模拟数据
│   └── utils.ts             # 工具函数
└── types/                   # TypeScript 类型
    └── index.ts
```

## 业务类型说明

### 进口业务
- **一线入区**: 货物直接进境报关
- **二线出区**: 保税货物进出区 (一般贸易/加工贸易)

### 出口业务
- **一线出区**: 货物直接出境报关
- **二线进区**: 货物进出监管区域 (一般贸易/加工贸易)

### 转仓业务
- **转出**: 货物转出仓库
- **转入**: 货物转入仓库

## 后续计划

- [ ] 真实 AI 识别集成 (Claude/GPT-4V)
- [ ] OCR 服务集成
- [ ] 后端 API 开发
- [ ] 数据库持久化
- [ ] 用户认证
- [ ] RPA 自动填报集成

## License

MIT
