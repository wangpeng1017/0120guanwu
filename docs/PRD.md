# 关务AI+RPA智能申报系统 产品需求文档 (PRD)

> 最后更新: 2026-01-26 | 版本: 1.3

---

## 一、项目概述

### 1.1 项目愿景
构建一个基于AI和RPA的智能报关申报系统，实现从单据识别、信息提取到报关单生成的全流程自动化。

### 1.2 目标用户
| 角色 | 描述 | 核心诉求 |
|------|------|----------|
| 报关员 | 处理日常报关业务 | 快速准确完成报关申报 |
| 贸易企业 | 进出口企业 | 降低报关成本，提高通关效率 |
| 物流公司 | 货代公司 | 简化报关流程，减少人工操作 |

### 1.3 业务流程图
```
上传单据 → AI识别类型 → 智能提取信息 → 编辑确认 → 生成报关单 → 提交申报
```

---

## 二、功能清单

### 状态说明
- 🔴 待开发 | 🟡 开发中 | 🟢 已完成 | ⚫ 已废弃

### 功能总览

| ID | 模块 | 功能 | 状态 | 优先级 | 对应代码 |
|----|------|------|------|--------|----------|
| F001 | 用户管理 | 用户登录 | 🟢 | P0 | - |
| F002 | 业务管理 | 综保区业务 | 🟢 | P0 | app/dashboard/bonded-zone/*/page.tsx |
| F003 | 业务管理 | 口岸业务 | 🟢 | P0 | app/dashboard/port/*/page.tsx |
| F004 | 单据管理 | 文件上传 | 🟢 | P0 | app/api/upload/route.ts |
| F005 | 单据管理 | 单据识别 | 🟢 | P0 | lib/ai/material-recognizer.ts |
| F006 | 信息提取 | AI智能提取 | 🟢 | P0 | app/api/extract/route.ts |
| F007 | 信息提取 | 字段提取 | 🟢 | P0 | lib/ai/field-extractor.ts |
| F008 | 报关单 | 编辑确认 | 🟢 | P0 | components/Declaration/DeclarationForm.tsx |
| F009 | 报关单 | 对比预览 | 🟢 | P1 | components/Declaration/ComparisonPreview.tsx |
| F010 | 报关单 | 生成Excel | 🟢 | P1 | app/api/generate/route.ts |
| F011 | 任务管理 | 任务列表 | 🟢 | P0 | app/dashboard/tasks/page.tsx |
| F012 | 任务管理 | 任务详情 | 🟢 | P0 | app/dashboard/tasks/[id]/page.tsx |
| F013 | 材料管理 | 材料清单 | 🟢 | P0 | components/Material/MaterialChecklist.tsx |
| F014 | 材料管理 | 文件下载 | 🟢 | P1 | components/Declaration/DownloadPanel.tsx |
| F015 | 委托材料 | 委托书生成 | 🟢 | P1 | lib/delegation/*, app/api/delegation/* |

---

## 三、功能详情

### F001: 用户登录
- **用户故事**: 作为报关员，我希望登录系统进行业务操作
- **验收标准**:
  - [ ] 支持用户名/邮箱登录
  - [ ] 登录成功跳转首页
- **技术备注**: 待实现
- **关联接口**: -

### F002: 综保区业务
- **用户故事**: 作为报关员，我希望处理综保区业务（一线进出境、二线进出区、区内流转）
- **验收标准**:
  - [x] 支持5种综保区业务类型
  - [x] 一线进口 (app/dashboard/bonded-zone/first-import/page.tsx)
  - [x] 一线出口 (app/dashboard/bonded-zone/first-export/page.tsx)
  - [x] 二线进仓 (app/dashboard/bonded-zone/second-in/page.tsx)
  - [x] 二线出仓 (app/dashboard/bonded-zone/second-out/page.tsx)
  - [x] 区内流转 (app/dashboard/bonded-zone/transfer/page.tsx)
- **技术备注**: 使用 businessCategory=BONDED_ZONE + businessType 区分业务类型
- **关联接口**: -

### F003: 口岸业务
- **用户故事**: 作为报关员，我希望处理口岸进出口业务
- **验收标准**:
  - [x] 支持口岸进口 (app/dashboard/port/import/page.tsx)
  - [x] 支持口岸出口 (app/dashboard/port/export/page.tsx)
- **技术备注**: 使用 businessCategory=PORT + businessType 区分业务类型
- **关联接口**: -

### F004: 文件上传
- **用户故事**: 作为报关员，我希望上传报关所需的各类单据
- **验收标准**:
  - [x] 支持多种文件格式 (PDF, Word, Excel, 图片等)
  - [x] 支持演示模式（无数据库时使用内存存储）
  - [x] 文件大小限制 50MB
  - [x] 自动识别单据类型
- **技术备注**:
  - POST /api/upload
  - 演示模式保存到 public/uploads，生产模式保存到 OSS
  - 代码: app/api/upload/route.ts
- **关联接口**: POST /api/upload

### F005: 单据识别
- **用户故事**: 系统应自动识别上传文件的单据类型
- **验收标准**:
  - [x] 支持8种单据类型识别
  - [x] 提单 (BILL_OF_LADING)
  - [x] 商业发票 (COMMERCIAL_INVOICE)
  - [x] 装箱单 (PACKING_LIST)
  - [x] 合同 (CONTRACT)
  - [x] 报关单 (CUSTOMS_DECLARATION)
  - [x] 核注清单 (BONDED_NOTE)
  - [x] 原产地证 (CERTIFICATE)
  - [x] 其他文件 (OTHER)
- **技术备注**:
  - 混合识别：文件名规则匹配 + AI视觉备份
  - 配置驱动：docs/field-mappings/material-types.json
  - 代码: lib/ai/material-recognizer.ts
- **关联接口**: -

### F006: AI智能提取
- **用户故事**: 系统应从单据中智能提取申报要素
- **验收标准**:
  - [x] 支持28个表头字段提取
  - [x] 支持13个表体字段提取
  - [x] 计算整体置信度
  - [x] 多模型自动切换（Gemini 2.5/3.0）
- **技术备注**:
  - POST /api/extract
  - 分层数据结构：header + body
  - 代码: app/api/extract/route.ts, lib/ai/declaration-extractor.ts
- **关联接口**: POST /api/extract

### F007: 字段提取
- **用户故事**: 针对不同单据类型提取对应字段
- **验收标准**:
  - [x] 配置化字段映射
  - [x] 支持自定义提取规则
  - [x] 返回置信度评分
- **技术备注**:
  - 配置文件: docs/field-mappings/field-rules/*.json
  - 代码: lib/ai/field-extractor.ts
- **关联接口**: -

### F008: 编辑确认
- **用户故事**: 作为报关员，我希望编辑和确认提取的信息
- **验收标准**:
  - [x] 表单展示提取的申报要素
  - [x] 支持手动编辑
  - [x] 显示置信度标识
  - [x] 表头 + 表体编辑
- **技术备注**:
  - Ant Design Form
  - 代码: components/Declaration/DeclarationForm.tsx
- **关联接口**: -

### F009: 对比预览
- **用户故事**: 作为报关员，我希望对比原始单据和提取结果
- **验收标准**:
  - [x] 左右对比视图
  - [x] 原始单据预览
  - [x] 提取字段标注
  - [x] 低置信度字段高亮
- **技术备注**:
  - 代码: components/Declaration/ComparisonPreview.tsx
- **关联接口**: -

### F010: 生成Excel
- **用户故事**: 作为报关员，我希望生成标准格式的报关单Excel
- **验收标准**:
  - [x] 支持进口/出口模板
  - [x] 表头 + 表体数据
  - [x] 下载生成的文件
- **技术备注**:
  - POST /api/generate
  - 代码: app/api/generate/route.ts
- **关联接口**: POST /api/generate

### F011: 任务列表
- **用户故事**: 作为报关员，我希望查看所有申报任务
- **验收标准**:
  - [x] 任务列表展示
  - [x] 状态筛选
  - [x] 业务类别筛选（综保区/口岸）
  - [x] 搜索功能
- **技术备注**:
  - 代码: app/dashboard/tasks/page.tsx
- **关联接口**: GET /api/tasks

### F012: 任务详情
- **用户故事**: 作为报关员，我希望查看和编辑单个任务
- **验收标准**:
  - [x] 任务信息展示
  - [x] 材料管理
  - [x] 申报要素编辑
  - [x] 生成报关单
- **技术备注**:
  - 代码: app/dashboard/tasks/[id]/page.tsx
- **关联接口**: GET /api/tasks/[id]

### F013: 材料清单
- **用户故事**: 系统应显示当前业务所需的材料清单
- **验收标准**:
  - [x] 根据业务类型动态显示所需材料
  - [x] 标注必填/选填
  - [x] 显示已上传数量
- **技术备注**:
  - 配置驱动: docs/field-mappings/required-materials.json
  - 代码: components/Material/MaterialChecklist.tsx
- **关联接口**: -

### F014: 文件下载
- **用户故事**: 作为报关员，我希望下载原始单据文件
- **验收标准**:
  - [x] 单个文件下载
  - [x] 批量打包下载
  - [x] 自动重命名（类型_编号.扩展名）
- **技术备注**:
  - 代码: components/Declaration/DownloadPanel.tsx
- **关联接口**: -

### F015: 委托书生成
- **用户故事**: 作为报关员，我希望从Excel中自动提取数据并生成标准格式的电子代理报关委托材料
- **验收标准**:
  - [x] 智能Excel解析（支持多种sheet类型：企业、客户、核注清单、发票、装箱单）
  - [x] 表头智能定位（支持表头位置不固定）
  - [x] 字段别名匹配（支持同一字段的多种命名方式）
  - [x] 多文件智能合并（按优先级合并，HS编码自动匹配商品）
  - [x] 生成委托书（包含委托方、被委托方信息）
  - [x] 生成委托协议（包含商品明细列表）
  - [x] 预览功能（表格预览委托书和协议内容）
  - [x] Excel下载（支持单独下载委托书和协议）
- **技术备注**:
  - 核心模块：
    - lib/delegation/parser.ts - Excel解析器（sheet类型识别、文件优先级计算）
    - lib/delegation/extractor.ts - 数据提取器（企业、客户、核注清单、商品明细提取）
    - lib/delegation/merger.ts - 数据合并器（多文件合并、商品去重）
    - lib/delegation/mapper.ts - 委托映射器（生成委托书和协议）
    - lib/delegation/excel-exporter.ts - Excel导出器
  - API接口：
    - POST /api/delegation/generate - 生成委托材料
    - POST /api/delegation/download-letter - 下载委托书Excel
    - POST /api/delegation/download-agreement - 下载委托协议Excel
  - 前端组件：
    - app/dashboard/delegation/page.tsx - 委托材料生成页面
    - components/Delegation/DelegationLetterPreview.tsx - 委托书预览
    - components/Delegation/DelegationAgreementPreview.tsx - 委托协议预览
  - 测试覆盖：55个测试全部通过
    - parser.test.ts: 15个测试 ✅
    - extractor.test.ts: 22个测试 ✅
    - merger.test.ts: 11个测试 ✅
    - mapper.test.ts: 7个测试 ✅
- **关联接口**: POST /api/delegation/generate, POST /api/delegation/download-letter, POST /api/delegation/download-agreement

---

## 四、数据模型概览

| 实体 | 说明 | 主要字段 |
|------|------|----------|
| Task | 任务表 | id, taskNo, businessCategory, businessType, status, preEntryNo, customsNo |
| Material | 材料表 | id, taskId, materialType, originalName, fileUrl, fileSize |
| Declaration | 申报表 | id, taskId, headerData, bodyData, confidenceScore, extractionMethod |
| GeneratedFile | 生成文件表 | id, taskId, fileType, fileName, fileUrl |
| OperationLog | 操作日志表 | id, taskId, action, details |

---

## 五、变更历史

| 日期 | 版本 | 变更内容 | 操作人 |
|------|------|----------|--------|
| 2026-01-23 | 1.0 | 初始版本，记录已完成功能 | AI |
| 2026-01-23 | 1.1 | 添加 F004-F014 功能（AI提取、上传等） | AI |
| 2026-01-25 | 1.2 | 新增 F015 委托书生成功能（Excel智能解析、多文件合并、TDD开发55个测试） | AI |
| 2026-01-26 | 1.3 | 所有申报页面改用多标签页布局，申报表单优化为6列Grid布局 | AI |
