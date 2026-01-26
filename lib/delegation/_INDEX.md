# delegation 模块索引

> 电子代理报关委托材料生成模块

---

## 📁 文件清单

| 文件 | 功能 | 说明 |
|------|------|------|
| **parser.ts** | Excel解析器 | Sheet类型智能识别、文件优先级计算 |
| **extractor.ts** | 数据提取器 | 从不同Sheet提取结构化数据（企业、客户、核注清单、商品） |
| **merger.ts** | 数据合并器 | 多文件智能合并、商品去重、优先级处理 |
| **mapper.ts** | 委托映射器 | 将提取数据映射为委托书和委托协议格式 |
| **excel-exporter.ts** | Excel导出器 | 导出委托书和委托协议为Excel文件 |
| **types.ts** | 类型定义 | 模块内部使用的TypeScript类型 |

---

## 🧪 测试文件

| 文件 | 测试数量 | 状态 |
|------|----------|------|
| **parser.test.ts** | 15个测试 | ✅ 全部通过 |
| **extractor.test.ts** | 22个测试 | ✅ 全部通过 |
| **merger.test.ts** | 11个测试 | ✅ 全部通过 |
| **mapper.test.ts** | 7个测试 | ✅ 全部通过 |

**总计**: 55个测试全部通过 ✅

---

## 🔄 数据流

```
Excel文件上传
    ↓
【parser.ts】识别Sheet类型、计算文件优先级
    ↓
【extractor.ts】提取企业信息、客户信息、核注清单、商品明细
    ↓
【merger.ts】多文件数据合并、商品去重
    ↓
【mapper.ts】映射为委托书和委托协议格式
    ↓
【excel-exporter.ts】导出Excel文件
```

---

## 🎯 核心特性

### 1. 智能Sheet识别 (parser.ts)
- **精确匹配**：Sheet名称完全匹配（置信度1.0）
- **模糊匹配**：Sheet名称包含关键字（置信度0.9）
- **字段匹配**：根据表头字段识别（置信度0.7-0.8）
- **优先级计算**：根据Sheet类型、数据行数、识别置信度计算文件优先级

### 2. 智能数据提取 (extractor.ts)
- **表头智能定位**：自动搜索前20行找到表头位置
- **字段别名匹配**：支持同一字段的多种命名方式
  - 例如：`['HS编码', '商品HS编码', '商品编码', 'HS CODE']` 都识别为HS编码
- **空行过滤**：自动过滤空行和汇总行
- **数值解析**：智能解析数值类型（数量、金额、重量）

### 3. 智能数据合并 (merger.ts)
- **优先级规则**：
  - 包含"核注清单"的文件优先级最高 (+100分)
  - 企业信息 +20分
  - 每个客户 +10分
  - 每个商品 +5分
- **商品匹配策略**：
  1. 优先按 HS编码 匹配
  2. 其次按 货号/料号 匹配
  3. 最后按 商品名称 匹配
- **字段合并**：高优先级文件的非空字段覆盖低优先级

### 4. 委托材料映射 (mapper.ts)
- **委托书**：包含委托方、被委托方信息、委托关系
- **委托协议**：每个商品生成一条协议记录
- **警告生成**：检测缺失的关键字段并生成警告信息

### 5. Excel导出 (excel-exporter.ts)
- **委托书格式**：使用Descriptions布局
- **委托协议格式**：使用Table布局
- **状态映射**：将枚举状态转换为中文显示

---

## 📊 支持的Sheet类型

| Sheet类型 | 识别关键字 | 提取内容 |
|-----------|-----------|----------|
| **enterprise** | 企业、加工单位、单位信息 | 企业名称、海关编码、统一社会信用代码 |
| **customer** | 客户、供应商、单位名称 | 客户名称、海关编码、统一社会信用代码、英文名 |
| **declaration** | 核注清单、备案编号 | 监管方式、备案编号、进出口标志、录入日期 |
| **invoice** | 发票、INVOICE | 商品名称、HS编码、数量、单价、总价、原产地 |
| **packing** | 装箱单、PACKING | 商品名称、HS编码、数量、净重、毛重 |

---

## 🔗 关联文件

### API接口
- `app/api/delegation/generate/route.ts` - 生成委托材料API
- `app/api/delegation/download-letter/route.ts` - 下载委托书API
- `app/api/delegation/download-agreement/route.ts` - 下载委托协议API

### 前端组件
- `app/dashboard/delegation/page.tsx` - 委托材料生成页面
- `components/Delegation/DelegationLetterPreview.tsx` - 委托书预览组件
- `components/Delegation/DelegationAgreementPreview.tsx` - 委托协议预览组件

### 类型定义
- `lib/types/delegation.ts` - 对外暴露的公共类型

---

## 📚 使用示例

### 1. 解析Excel文件
```typescript
import { parseExcelFile } from './parser'
import * as XLSX from 'xlsx'

const workbook = XLSX.readFile('example.xlsx')
const result = parseExcelFile('example.xlsx', workbook)

console.log(result.sheets) // Sheet分类结果
console.log(result.priority) // 文件优先级
```

### 2. 提取数据
```typescript
import { extractDataFromFile } from './extractor'

const extractedData = extractDataFromFile(workbook, parsedFile)

console.log(extractedData.enterprise) // 企业信息
console.log(extractedData.customers) // 客户列表
console.log(extractedData.goods) // 商品列表
```

### 3. 合并多文件
```typescript
import { mergeExcelData } from './merger'

const filesData = [
  { fileName: 'file1.xlsx', data: extractedData1 },
  { fileName: 'file2.xlsx', data: extractedData2 }
]

const merged = mergeExcelData(filesData)
```

### 4. 生成委托材料
```typescript
import { mapDelegationData } from './mapper'

const result = mapDelegationData(mergedData)

console.log(result.delegationLetter) // 委托书
console.log(result.delegationAgreements) // 委托协议列表
console.log(result.warnings) // 警告信息
```

### 5. 导出Excel
```typescript
import { exportDelegationLetterToExcel, exportDelegationAgreementsToExcel } from './excel-exporter'

const letterBuffer = exportDelegationLetterToExcel(delegationLetter)
const agreementsBuffer = exportDelegationAgreementsToExcel(delegationAgreements)
```

---

## 🎓 设计原则

1. **TDD开发**：所有核心功能都有完整测试覆盖
2. **单一职责**：每个模块只负责一个明确的功能
3. **可测试性**：纯函数设计，便于单元测试
4. **类型安全**：完整的TypeScript类型定义
5. **容错性**：智能处理缺失字段、空值、格式异常
6. **可扩展性**：配置驱动的字段别名和Sheet类型识别

---

## 📝 维护日志

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-01-25 | 1.0 | 初始版本，完成核心功能和55个测试 |
