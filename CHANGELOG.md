# 变更日志

本文件记录关务AI+RPA智能申报系统的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [1.3.0] - 2026-01-26

### 🔧 功能改进

- **申报页面布局全面优化**
  - 所有申报页面（综保区、口岸）改用多标签页布局
  - 材料上传、申报要素、下载功能分标签展示
  - 每个标签页利用全屏宽度，提升用户体验
  - 符合用户操作流程：上传材料 → 填写申报 → 下载报关单

- **申报表单布局改进**
  - 表头字段改用6列Grid布局（原为inline布局）
  - 响应式设计：移动端2列、平板4列、桌面6列
  - 重要字段占2列，普通字段占1列，备注占3列
  - 字段间距更舒适，不再拥挤

- **商品明细表格优化**
  - 全屏宽度展示，无需横向滚动
  - 13列字段布局更合理

### 🛠️ 技术实现

- **新增组件**
  - `components/Declaration/DeclarationTabs.tsx` - 标签页布局组件
    - 封装 Ant Design Tabs 逻辑
    - 统一标签页结构（材料上传、申报要素、下载）
    - 支持 bondedZoneType 和 portType 参数

- **重构组件**
  - `components/Declaration/DeclarationForm.tsx` - 表头布局重构
    - 从 `layout="inline"` 改为 `layout="vertical"` + Grid
    - 使用 `grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4`
    - 字段按重要性分配列宽（`col-span-1/2/3`）

- **更新页面**（7个申报页面）
  - `app/dashboard/bonded-zone/first-import/page.tsx` - 综保区一线进口
  - `app/dashboard/bonded-zone/first-export/page.tsx` - 综保区一线出口
  - `app/dashboard/bonded-zone/second-in/page.tsx` - 综保区二线进仓
  - `app/dashboard/bonded-zone/second-out/page.tsx` - 综保区二线出仓
  - `app/dashboard/bonded-zone/transfer/page.tsx` - 综保区内部转移
  - `app/dashboard/port/import/page.tsx` - 口岸进口
  - `app/dashboard/port/export/page.tsx` - 口岸出口
  - 移除���右二列布局 (`grid grid-cols-1 lg:grid-cols-2`)
  - 直接使用 `<DeclarationTabs />` 组件

### 📝 文档更新

- 更新 `docs/PRD.md` - 版本升级至 1.3，记录布局变更
- 更新 `CHANGELOG.md` - 记录本次优化详情

---

## [1.2.0] - 2026-01-25

### ✨ 新增功能

- **电子代理报关委托材料生成系统** (F015)
  - Excel智能解析：自动识别企业、客户、核注清单、发票、装箱单等sheet类型
  - 表头智能定位：支持表头位置不固定，自动搜索前20行
  - 字段别名匹配：支持同一字段的多种命名方式（如"HS编码"、"商品HS编码"、"商品编码"）
  - 多文件智能合并：按文件优先级自动合并数据，HS编码智能匹配商品
  - 委托书生成：包含委托方、被委托方完整信息
  - 委托协议生成：包含商品明细列表（序号、货物名称、HS编码、数量、单位、总值等）
  - 预览功能：Ant Design表格预览委托书和协议内容
  - Excel下载：支持单独下载委托书Excel和委托协议Excel

### 🛠️ 技术实现

- **核心模块**
  - `lib/delegation/parser.ts` - Excel解析器（sheet类型识别、文件优先级计算）
  - `lib/delegation/extractor.ts` - 数据提取器（企业、客户、核注清单、商品明细提取）
  - `lib/delegation/merger.ts` - 数据合并器（多文件合并、商品去重）
  - `lib/delegation/mapper.ts` - 委托映射器（生成委托书和协议）
  - `lib/delegation/excel-exporter.ts` - Excel导出器

- **API接口**
  - `POST /api/delegation/generate` - 生成委托材料
  - `POST /api/delegation/download-letter` - 下载委托书Excel
  - `POST /api/delegation/download-agreement` - 下载委托协议Excel

- **前端组件**
  - `app/dashboard/delegation/page.tsx` - 委托材料生成页面
  - `components/Delegation/DelegationLetterPreview.tsx` - 委托书预览组件
  - `components/Delegation/DelegationAgreementPreview.tsx` - 委托协议预览组件

### 🧪 测试覆盖

- **TDD开发，55个测试全部通过**
  - `lib/delegation/parser.test.ts` - 15个测试 ✅
  - `lib/delegation/extractor.test.ts` - 22个测试 ✅
  - `lib/delegation/merger.test.ts` - 11个测试 ✅
  - `lib/delegation/mapper.test.ts` - 7个测试 ✅

### 🚀 部署

- 已部署到阿里云服务器：http://8.130.182.148:3005
- 构建成功，PM2进程正常运行

---

## [1.1.0] - 2026-01-23

### ✨ 新增功能

- **文件上传管理** (F004)
  - 支持多种文件格式（PDF、Word、Excel、图片）
  - 演示模式支持（无数据库时使用内存存储）
  - 文件大小限制50MB
  - 自动生成任务编号

- **单据智能识别** (F005)
  - 支持8种单据类型自动识别
  - 混合识别策略：文件名规则 + AI视觉备份
  - 配置驱动：`docs/field-mappings/material-types.json`

- **AI智能提取** (F006, F007)
  - 支持28个表头字段提取
  - 支持13个表体字段提取
  - 多模型自动切换（Gemini 2.5/3.0）
  - 分层数据结构：header + body
  - 置信度评分

- **报关单编辑确认** (F008, F009)
  - 表单展示提取的申报要素
  - 支持手动编辑
  - 对比预览功能
  - 低置信度字段高亮

- **报关单生成** (F010)
  - 支持进口/出口模板
  - Excel格式输出
  - 下载功能

- **任务管理** (F011, F012)
  - 任务列表展示
  - 状态筛选
  - 业务类别筛选
  - 任务详情页面

- **材料管理** (F013, F014)
  - 动态材料清单
  - 标注必填/选填
  - 单个文件下载
  - 批量打包下载

### 🛠️ 技术实现

- 配置化字段映射：`docs/field-mappings/field-rules/*.json`
- AI提取模块：`lib/ai/declaration-extractor.ts`, `lib/ai/field-extractor.ts`
- 单据识别：`lib/ai/material-recognizer.ts`
- 材料清单组件：`components/Material/MaterialChecklist.tsx`
- 对比预览组件：`components/Declaration/ComparisonPreview.tsx`

---

## [1.0.0] - 2026-01-23

### ✨ 初始版本

- **业务管理**
  - 综保区业务（F002）：一线进出口、二线进出区、区内流转
  - 口岸业务（F003）：口岸进出口

- **用户管理**
  - 用户登录（F001）

- **基础架构**
  - Next.js 15 + TypeScript
  - Prisma ORM
  - Ant Design UI
  - PostgreSQL数据库

---

## 图例

- ✨ 新增功能
- 🔧 功能改进
- 🐛 Bug修复
- 🛠️ 技术实现
- 🧪 测试相关
- 📝 文档更新
- 🚀 部署相关
- ⚠️ 破坏性变更
- 🗑️ 废弃功能
