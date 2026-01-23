# 关务AI+RPA智能申报系统 - AI智能提取功能设计文档

> 创建日期: 2026-01-23
> 版本: 1.0
> 状态: 设计已完成，待实现

---

## 一、设计概述

### 1.1 功能目标

实现从报关单据（提单、发票、装箱单、合同、报关单、核注清单等）中智能提取关键字段，自动填充到海关申报单中，减少人工录入工作，提高申报效率和准确性。

### 1.2 核心特性

- **智能分类识别**：自动识别单据类型和业务类型
- **混合识别引擎**：文件名规则优先 + AI 视觉备用
- **对比预览界面**：左右分栏，实时核对原始单据和提取结果
- **置信度可视化**：高亮显示低置信度字段，提醒用户重点关注
- **配置化管理**：字段映射规则通过配置文件管理，支持灵活调整

### 1.3 业务场景

支持以下业务场景的单据提取：

**综保区进出区清关：**
- 一线进出清关（进口/出口）
- 二线进出清关（进仓/出仓）
- 区内流转清关

**口岸进出口清关：**
- 口岸进口清关
- 口岸出口清关

---

## 二、系统架构设计

### 2.1 数据流程图

```
用户创建任务（选择业务类型）
    ↓
上传单据文件（自动识别单据类型）
    ↓
混合识别引擎
    ├─ 文件名规则识别（优先）
    └─ AI 视觉识别（备用）
    ↓
字段映射引擎（根据业务类型+单据类型提取字段）
    ↓
对比预览界面
    ├─ 左侧：原始单据预览
    └─ 右侧：提取结果编辑
    ↓
用户确认编辑（高亮低置信度字段）
    ↓
生成分层数据结构（header + body）
    ↓
导出/下载
```

### 2.2 核心组件

| 组件 | 职责 |
|------|------|
| **任务管理器** | 管理申报任务的生命周期（草稿→上传→提取→编辑→完成） |
| **单据识别器** | 混合识别引擎（文件名规则 + AI 视觉识别） |
| **字段映射器** | 根据配置文件提取对应字段 |
| **预览编辑器** | 左右分栏对比界面，高亮低置信度字段 |

### 2.3 技术栈

- **AI 视觉识别**：Claude/GPT-4V API
- **PDF 处理**：pdf2json, pdf-parse
- **Excel 处理**：exceljs, xlsx
- **状态管理**：Zustand
- **数据库**：Prisma + PostgreSQL

---

## 三、业务类型与菜单结构

### 3.1 新的菜单结构

```
├── 综保区进出区清关
│   ├── 一线进出清关
│   │   ├── 一线进口
│   │   └── 一线出口
│   ├── 二线进出清关
│   │   ├── 二线进仓
│   │   └── 二线出仓
│   └── 区内流转清关
│
└── 口岸进出口清关
    ├── 口岸进口清关
    └── 口岸出口清关
```

### 3.2 业务类型枚举

```typescript
enum BusinessCategory {
  BONDED_ZONE    // 综保区进出区清关
  PORT           // 口岸进出口清关
}

enum BondedZoneBusiness {
  FIRST_IMPORT     // 一线进口
  FIRST_EXPORT     // 一线出口
  SECOND_IN        // 二线进仓
  SECOND_OUT       // 二线出仓
  TRANSFER         // 区内流转
}

enum PortBusiness {
  PORT_IMPORT      // 口岸进口
  PORT_EXPORT      // 口岸出口
}
```

### 3.3 Prisma Schema 更新

```prisma
model Task {
  id                String            @id @default(cuid())
  taskNo            String            @unique

  // 业务类型（更新）
  businessCategory  BusinessCategory  // 综保区/口岸
  businessType      String            // 具体业务类型（业务类型代码）

  // 原有字段保留
  status            TaskStatus        @default(DRAFT)
  preEntryNo        String?
  customsNo         String?

  // 关联
  materials         Material[]
  declarations      Declaration[]
  generatedFiles    GeneratedFile[]
  operationLogs     OperationLog[]

  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
}

enum BusinessCategory {
  BONDED_ZONE       // 综保区进出区清关
  PORT              // 口岸进出口清关
}
```

---

## 四、单据类型识别设计

### 4.1 单据类型枚举

```typescript
enum MaterialType {
  BILL_OF_LADING      // 提单
  COMMERCIAL_INVOICE  // 商业发票
  PACKING_LIST        // 装箱单
  CONTRACT            // 合同
  CUSTOMS_DECLARATION // 报关单
  BONDED_NOTE         // 核注清单
  OTHER               // 其他
}
```

### 4.2 混合识别流程

```typescript
// 文件名规则模式配置
const FILENAME_PATTERNS = {
  BILL_OF_LADING: [
    /提单/i,
    /Bill of Lading/i,
    /\.BL\./i,
    /B\/L/i
  ],
  COMMERCIAL_INVOICE: [
    /发票/i,
    /Invoice/i,
    /Commercial Invoice/i
  ],
  PACKING_LIST: [
    /箱单/i,
    /装箱单/i,
    /Packing List/i,
    /PL/i
  ],
  CONTRACT: [
    /合同/i,
    /Contract/i
  ],
  CUSTOMS_DECLARATION: [
    /报关单/i,
    /Customs Declaration/i
  ],
  BONDED_NOTE: [
    /核注清单/i,
    /Bonded Note/i
  ]
};

// 识别流程
async function识别单据类型(fileName: string, fileBuffer: Buffer) {
  // 1. 文件名规则识别（优先，快速且免费）
  for (const [type, patterns] of Object.entries(FILENAME_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(fileName)) {
        return {
          type,
          method: 'filename-rule',
          confidence: 1.0
        };
      }
    }
  }

  // 2. AI 视觉识别（备用，准确但慢且有成本）
  return await识别ByAI(fileBuffer);
}
```

---

## 五、字段映射配置设计

### 5.1 配置文件结构

```
docs/field-mappings/
├── business-types.json          # 业务类型定义
├── material-types.json          # 单据类型定义
├── required-materials.json      # 必备单据清单
└── field-rules/                 # 字段映射规则
    ├── bill-of-lading.json     # 提单字段映射
    ├── commercial-invoice.json # 发票字段映射
    ├── packing-list.json       # 装箱单字段映射
    ├── contract.json           # 合同字段映射
    ├── customs-declaration.json # 报关单字段映射
    └── bonded-note.json        # 核注清单字段映射
```

### 5.2 字段映射配置示例

**`docs/field-mappings/field-rules/bill-of-lading.json`：**
```json
{
  "materialType": "BILL_OF_LADING",
  "description": "提单字段提取规则",
  "extractFields": [
    {
      "fieldName": "提单号",
      "jsonPath": "header.billNo",
      "extractionPrompt": "提取提单号，通常包含B/L、Bill of Lading等字样",
      "priority": "required",
      "dataType": "string",
      "validation": "^[A-Z0-9]{8,20}$"
    },
    {
      "fieldName": "船名航次",
      "jsonPath": "header.vessel",
      "extractionPrompt": "提取船名和航次，格式如：船名+航次号",
      "priority": "required",
      "dataType": "string"
    },
    {
      "fieldName": "起运港",
      "jsonPath": "header.portOfLoading",
      "extractionPrompt": "提取起运港（Port of Loading）名称",
      "priority": "optional",
      "dataType": "string"
    },
    {
      "fieldName": "目的港",
      "jsonPath": "header.portOfDischarge",
      "extractionPrompt": "提取目的港（Port of Discharge）名称",
      "priority": "required",
      "dataType": "string"
    },
    {
      "fieldName": "件数",
      "jsonPath": "header.totalPackages",
      "extractionPrompt": "提取总件数（Packages）",
      "priority": "required",
      "dataType": "number"
    },
    {
      "fieldName": "毛重",
      "jsonPath": "header.grossWeight",
      "extractionPrompt": "提取总毛重（Gross Weight），包含单位",
      "priority": "required",
      "dataType": "string"
    }
  ]
}
```

**`docs/field-mappings/field-rules/commercial-invoice.json`：**
```json
{
  "materialType": "COMMERCIAL_INVOICE",
  "description": "商业发票字段提取规则",
  "extractFields": [
    {
      "fieldName": "发票号",
      "jsonPath": "header.invoiceNo",
      "extractionPrompt": "提取发票号（Invoice No.）",
      "priority": "required",
      "dataType": "string"
    },
    {
      "fieldName": "发票日期",
      "jsonPath": "header.invoiceDate",
      "extractionPrompt": "提取发票日期（Invoice Date），格式YYYY-MM-DD",
      "priority": "required",
      "dataType": "date"
    },
    {
      "fieldName": "卖方",
      "jsonPath": "header.seller",
      "extractionPrompt": "提取卖方名称和地址",
      "priority": "required",
      "dataType": "object"
    },
    {
      "fieldName": "买方",
      "jsonPath": "header.buyer",
      "extractionPrompt": "提取买方名称和地址",
      "priority": "required",
      "dataType": "object"
    },
    {
      "fieldName": "币制",
      "jsonPath": "header.currency",
      "extractionPrompt": "提取货币代码，如USD、CNY等",
      "priority": "required",
      "dataType": "string"
    },
    {
      "fieldName": "总价",
      "jsonPath": "header.totalAmount",
      "extractionPrompt": "提取发票总金额",
      "priority": "required",
      "dataType": "number"
    }
  ],
  "bodyFields": [
    {
      "fieldName": "商品名称",
      "jsonPath": "body[].description",
      "extractionPrompt": "提取商品描述",
      "priority": "required",
      "dataType": "string"
    },
    {
      "fieldName": "数量",
      "jsonPath": "body[].quantity",
      "extractionPrompt": "提取商品数量",
      "priority": "required",
      "dataType": "number"
    },
    {
      "fieldName": "单价",
      "jsonPath": "body[].unitPrice",
      "extractionPrompt": "提取商品单价",
      "priority": "required",
      "dataType": "number"
    },
    {
      "fieldName": "总价",
      "jsonPath": "body[].totalPrice",
      "extractionPrompt": "提取商品总价",
      "priority": "required",
      "dataType": "number"
    }
  ]
}
```

---

## 六、必备单据清单配置

### 6.1 配置文件示例

**`docs/field-mappings/required-materials.json`：**
```json
{
  "businessTypes": {
    "BONDED_ZONE_FIRST_IMPORT": {
      "code": "BONDED_ZONE_FIRST_IMPORT",
      "name": "综保区一线进口",
      "description": "货物从境外进入综合保税区",
      "required": [
        { "type": "BILL_OF_LADING", "name": "提单", "minCount": 1 },
        { "type": "COMMERCIAL_INVOICE", "name": "商业发票", "minCount": 1 },
        { "type": "PACKING_LIST", "name": "装箱单", "minCount": 1 },
        { "type": "BONDED_NOTE", "name": "核注清单", "minCount": 1 }
      ],
      "optional": [
        { "type": "CONTRACT", "name": "合同" }
      ]
    },
    "BONDED_ZONE_FIRST_EXPORT": {
      "code": "BONDED_ZONE_FIRST_EXPORT",
      "name": "综保区一线出口",
      "description": "货物从综合保税区运往境外",
      "required": [
        { "type": "BILL_OF_LADING", "name": "提单", "minCount": 1 },
        { "type": "COMMERCIAL_INVOICE", "name": "商业发票", "minCount": 1 },
        { "type": "PACKING_LIST", "name": "装箱单", "minCount": 1 },
        { "type": "BONDED_NOTE", "name": "核注清单", "minCount": 1 }
      ],
      "optional": [
        { "type": "CONTRACT", "name": "合同" }
      ]
    },
    "BONDED_ZONE_SECOND_IN": {
      "code": "BONDED_ZONE_SECOND_IN",
      "name": "综保区二线进仓",
      "description": "货物从境内进入综合保税区",
      "required": [
        { "type": "BONDED_NOTE", "name": "核注清单", "minCount": 1 }
      ],
      "optional": [
        { "type": "COMMERCIAL_INVOICE", "name": "商业发票" },
        { "type": "PACKING_LIST", "name": "装箱单" }
      ]
    },
    "BONDED_ZONE_SECOND_OUT": {
      "code": "BONDED_ZONE_SECOND_OUT",
      "name": "综保区二线出仓",
      "description": "货物从综合保税区运往境内",
      "required": [
        { "type": "CUSTOMS_DECLARATION", "name": "报关单", "minCount": 1 },
        { "type": "BONDED_NOTE", "name": "核注清单", "minCount": 1 }
      ],
      "optional": [
        { "type": "COMMERCIAL_INVOICE", "name": "商业发票" },
        { "type": "PACKING_LIST", "name": "装箱单" }
      ]
    },
    "BONDED_ZONE_TRANSFER": {
      "code": "BONDED_ZONE_TRANSFER",
      "name": "综保区区内流转",
      "description": "综合保税区内企业之间货物流转",
      "required": [
        { "type": "BONDED_NOTE", "name": "核注清单", "minCount": 2 }
      ],
      "optional": []
    },
    "PORT_IMPORT": {
      "code": "PORT_IMPORT",
      "name": "口岸进口",
      "description": "货物从境外进口到口岸",
      "required": [
        { "type": "BILL_OF_LADING", "name": "提单", "minCount": 1 },
        { "type": "COMMERCIAL_INVOICE", "name": "商业发票", "minCount": 1 },
        { "type": "PACKING_LIST", "name": "装箱单", "minCount": 1 },
        { "type": "CONTRACT", "name": "合同", "minCount": 1 }
      ],
      "optional": [
        { "type": "CUSTOMS_DECLARATION", "name": "报关单" }
      ]
    },
    "PORT_EXPORT": {
      "code": "PORT_EXPORT",
      "name": "口岸出口",
      "description": "货物从口岸出口到境外",
      "required": [
        { "type": "BILL_OF_LADING", "name": "提单", "minCount": 1 },
        { "type": "COMMERCIAL_INVOICE", "name": "商业发票", "minCount": 1 },
        { "type": "PACKING_LIST", "name": "装箱单", "minCount": 1 },
        { "type": "CONTRACT", "name": "合同", "minCount": 1 }
      ],
      "optional": [
        { "type": "CUSTOMS_DECLARATION", "name": "报关单" }
      ]
    }
  }
}
```

### 6.2 材料清单组件更新

```tsx
// components/Material/MaterialChecklist.tsx
import { REQUIRED_MATERIALS } from '@/config/required-materials';

export function MaterialChecklist({ businessType }: { businessType: string }) {
  const checklist = REQUIRED_MATERIALS.businessTypes[businessType];

  return (
    <div className="space-y-4">
      {/* 必备单据 */}
      <div>
        <h3 className="text-lg font-semibold mb-2">必备单据</h3>
        {checklist.required.map(item => (
          <MaterialItem
            key={item.type}
            type={item.type}
            name={item.name}
            minCount={item.minCount}
            required={true}
          />
        ))}
      </div>

      {/* 可选单据 */}
      {checklist.optional.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-2">可选单据</h3>
          {checklist.optional.map(item => (
            <MaterialItem
              key={item.type}
              type={item.type}
              name={item.name}
              required={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 七、提取数据结构设计

### 7.1 分层数据结构

```json
{
  "taskId": "clxxx",
  "businessType": "BONDED_ZONE_FIRST_IMPORT",
  "extractedAt": "2026-01-23T10:00:00Z",

  "header": {
    "提单号": "2635601131",
    "船名航次": "OAPAC20260104AM",
    "起运港": "洛杉矶",
    "目的港": "深圳",
    "贸易方式": "保税进出区",
    "运输方式": "海运",
    "发票号": "INV-2026-001",
    "发票日期": "2026-01-13",
    "合同号": "HSTL2025122501",
    "币制": "USD",
    "总价": 150000.00
  },

  "body": [
    {
      "项号": "1",
      "商品名称": "汽车LED大灯",
      "商品编码": "8512201000",
      "数量": 100,
      "单位": "个",
      "单价": 500.00,
      "总价": 50000.00,
      "毛重": "1200KG",
      "净重": "1000KG",
      "原产国": "美国",
      "confidence": 0.95
    }
  ],

  "sourceMaterials": [
    {
      "materialType": "BILL_OF_LADING",
      "fileName": "提单.pdf",
      "extractedFields": ["提单号", "船名航次", "起运港", "目的港"]
    },
    {
      "materialType": "COMMERCIAL_INVOICE",
      "fileName": "发票.pdf",
      "extractedFields": ["发票号", "发票日期", "币制", "总价", "body"]
    }
  ]
}
```

### 7.2 Prisma Schema 更新

```prisma
model Declaration {
  id              String    @id @default(cuid())
  taskId          String
  task            Task      @relation(fields: [taskId], references: [id], onDelete: Cascade)

  // 分层数据结构（更新）
  headerData      Json      // 表头数据，如：{提单号: "", 船名航次: "", ...}
  bodyData        Json      // 表体数据（商品明细数组），如：[{项号: "1", 商品名称: "", ...}]

  // 元数据（新增）
  confidenceScore Float?    @default(0) // 整体置信度（0-1）
  extractionMethod String   // "filename-rule" | "ai-vision" | "mixed"
  sourceMaterials  Json?    // 记录每个字段来自哪个单据，如：[{materialType: "BILL_OF_LADING", fileName: "提单.pdf", extractedFields: ["提单号", "船名航次"]}]

  isConfirmed     Boolean   @default(false)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([taskId])
}
```

---

## 八、对比预览界面设计

### 8.1 界面布局

```tsx
<Row gutter={16}>
  {/* 左侧：原始单据预览 */}
  <Col span={12}>
    <Card title="原始单据预览">
      <Tabs>
        {materials.map(material => (
          <TabPane tab={material.fileName} key={material.id}>
            <PDFViewer src={material.fileUrl} />
          </TabPane>
        ))}
      </Tabs>
    </Card>
  </Col>

  {/* 右侧：提取结果编辑 */}
  <Col span={12}>
    <Card title="提取结果">
      {/* 表头信息 */}
      <Section title="表头信息">
        <Form form={form}>
          {headerFields.map(field => (
            <FormItem
              key={field.name}
              label={field.label}
              validateStatus={field.confidence < 0.8 ? 'warning' : ''}
              help={field.confidence < 0.8 ? 'AI置信度较低，请核对' : ''}
            >
              <Input
                defaultValue={field.value}
                onChange={(e) => updateField(field.name, e.target.value)}
              />
              <Progress
                percent={Math.round(field.confidence * 100)}
                size="small"
                status={field.confidence < 0.8 ? 'exception' : 'success'}
              />
            </FormItem>
          ))}
        </Form>
      </Section>

      {/* 商品明细表格 */}
      <Section title="商品明细">
        <Table
          columns={goodsColumns}
          dataSource={bodyData}
          editable
          rowKey="项号"
        />
      </Section>
    </Card>
  </Col>
</Row>
```

### 8.2 关键交互特性

1. **置信度可视化**
   - 低于 80% 的字段显示黄色警告边框
   - 显示置信度进度条
   - 异常状态使用红色

2. **实时同步**
   - 右侧修改后，左侧单据中的对应位置高亮显示（如果技术支持）
   - 修改自动保存到状态管理

3. **分步确认**
   - 先确认表头信息
   - 再确认商品明细
   - 避免一次性修改过多

4. **快速定位**
   - 点击右侧字段，左侧自动跳转到对应页面位置（如果技术支持）
   - 高亮显示对应区域

---

## 九、AI 识别引擎设计

### 9.1 文件结构

```
lib/
├── ai/
│   ├── material-recognizer.ts    # 单据类型识别器
│   ├── field-extractor.ts        # 字段提取引擎
│   ├── vision-client.ts          # AI 视觉识别客户端
│   └── types.ts                  # AI 相关类型定义
├── config/
│   ├── field-mappings.ts         # 加载字段映射配置
│   ├── required-materials.ts     # 加载必备单据配置
│   └── index.ts
└── utils/
    ├── confidence-scoring.ts     # 置信度计算
    └── json-path.ts              # JSON 路径操作
```

### 9.2 单据识别器实现

```typescript
// lib/ai/material-recognizer.ts

// 文件名规则模式配置
const FILENAME_PATTERNS = {
  BILL_OF_LADING: [
    /提单/i,
    /Bill of Lading/i,
    /\.BL\./i,
    /B\/L/i
  ],
  COMMERCIAL_INVOICE: [
    /发票/i,
    /Invoice/i,
    /Commercial Invoice/i
  ],
  PACKING_LIST: [
    /箱单/i,
    /装箱单/i,
    /Packing List/i,
    /PL/i
  ],
  CONTRACT: [
    /合同/i,
    /Contract/i
  ],
  CUSTOMS_DECLARATION: [
    /报关单/i,
    /Customs Declaration/i
  ],
  BONDED_NOTE: [
    /核注清单/i,
    /Bonded Note/i
  ]
};

/**
 * 识别单据类型（混合方式）
 */
export async function识别单据类型 {
  // 1. 文件名规则识别（优先，快速且免费）
  for (const [type, patterns] of Object.entries(FILENAME_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(fileName)) {
        return {
          type: type as MaterialType,
          method: 'filename-rule' as const,
          confidence: 1.0
        };
      }
    }
  }

  // 2. AI 视觉识别（备用，准确但慢且有成本）
  return await识别ByAI(fileBuffer);
}

/**
 * 通过 AI 视觉识别单据类型
 */
async function识别ByAI(fileBuffer: Buffer): Promise<{
  type: MaterialType;
  method: 'ai-vision';
  confidence: number;
}> {
  // 调用 AI API 识别单据类型
  const prompt = `
    请识别这份单据的类型，从以下类型中选择一个：
    - 提单 (BILL_OF_LADING)
    - 商业发票 (COMMERCIAL_INVOICE)
    - 装箱单 (PACKING_LIST)
    - 合同 (CONTRACT)
    - 报关单 (CUSTOMS_DECLARATION)
    - 核注清单 (BONDED_NOTE)

    只返回类型代码和置信度（0-1），格式：{"type": "BILL_OF_LADING", "confidence": 0.95}
  `;

  const result = await callVisionAPI(fileBuffer, prompt);
  return JSON.parse(result);
}
```

### 9.3 字段提取器实现

```typescript
// lib/ai/field-extractor.ts

/**
 * 从单据中提取字段
 */
export async function提取字段 {
  // 1. 加载字段映射配置
  const fieldRules = loadFieldRules(materialType, businessType);

  // 2. 提取文本内容（根据文件类型）
  const textContent = await extractText(fileBuffer, fileType);

  // 3. 调用 AI 提取字段
  const extractedData = await extractFieldsByAI(
    textContent,
    fieldRules,
    materialType,
    businessType
  );

  // 4. 计算置信度
  const scoredData = calculateConfidence(extractedData, fieldRules);

  // 5. 映射到申报单结构
  const declarationData = mapToDeclarationStructure(scoredData);

  // 6. 记录来源
  declarationData.sourceMaterials = [{
    materialType,
    fileName,
    extractedFields: Object.keys(extractedData)
  }];

  return declarationData;
}

/**
 * 构建提取 Prompt
 */
function buildExtractionPrompt(
  fieldRules: FieldRule[],
  materialType: string,
  businessType: string
): string {
  const fields = fieldRules.map(rule =>
    `- ${rule.fieldName}: ${rule.extractionPrompt}`
  ).join('\n');

  return `
    你是专业的报关单据提取助手。

    单据类型：${materialType}
    业务类型：${businessType}

    请从以下单据内容中提取关键字段：
    ${fields}

    返回 JSON 格式：
    {
      "fields": [
        {"fieldName": "提单号", "value": "2635601131", "confidence": 0.95},
        {"fieldName": "船名航次", "value": "OAPAC20260104AM", "confidence": 0.90}
      ]
    }
  `;
}

/**
 * 调用 AI API 提取字段
 */
async function extractFieldsByAI(
  textContent: string,
  fieldRules: FieldRule[],
  materialType: string,
  businessType: string
): Promise<ExtractedField[]> {
  const prompt = buildExtractionPrompt(fieldRules, materialType, businessType);

  const response = await callAIAPI({
    prompt: `${prompt}\n\n单据内容：\n${textContent}`,
    responseFormat: { type: 'json_object' }
  });

  return JSON.parse(response).fields;
}

/**
 * 计算置信度
 */
function calculateConfidence(
  extractedData: ExtractedField[],
  fieldRules: FieldRule[]
): ExtractedField[] {
  return extractedData.map(field => {
    const rule = fieldRules.find(r => r.fieldName === field.fieldName);

    // 如果 AI 没有返回置信度，基于规则计算
    if (!field.confidence && rule) {
      // 必填字段且值格式正确，置信度高
      if (rule.priority === 'required' && validateValue(field.value, rule.dataType)) {
        field.confidence = 0.9;
      } else {
        field.confidence = 0.7;
      }
    }

    return field;
  });
}

/**
 * 映射到申报单结构
 */
function mapToDeclarationStructure(scoredData: ExtractedField[]): {
  header: Record<string, any>;
  body: any[];
} {
  const header: Record<string, any> = {};
  const body: any[] = [];

  scoredData.forEach(field => {
    // 判断是表头还是表体字段
    if (field.jsonPath?.startsWith('header.')) {
      const key = field.jsonPath.replace('header.', '');
      header[key] = {
        value: field.value,
        confidence: field.confidence
      };
    } else if (field.jsonPath?.startsWith('body[')) {
      // 处理表体字段
      // TODO: 解析数组索引和字段名
    }
  });

  return { header, body };
}
```

### 9.4 AI 视觉客户端

```typescript
// lib/ai/vision-client.ts

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * 调用 Claude 视觉 API
 */
export async function callVisionAPI(
  fileBuffer: Buffer,
  prompt: string
): Promise<string> {
  // 将 PDF 转换为图片（如果是 PDF）
  const images = await convertPdfToImages(fileBuffer);

  // 构建消息
  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          ...images.map(img => ({
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: img.toString('base64')
            }
          }))
        ]
      }
    ]
  });

  return message.content[0].text;
}

/**
 * 调用 Claude 文本 API（用于字段提取）
 */
export async function callAIAPI(params: {
  prompt: string;
  responseFormat?: { type: 'json_object' };
}): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: params.prompt
      }
    ]
  });

  return message.content[0].text;
}
```

---

## 十、实现步骤

### 10.1 阶段一：基础设施

- [ ] 更新 Prisma Schema（业务类型枚举、Declaration 数据结构）
- [ ] 同步数据库（`npx prisma db push`）
- [ ] 创建配置文件目录结构

### 10.2 阶段二：配置文件

- [ ] 创建 `business-types.json`
- [ ] 创建 `material-types.json`
- [ ] 创建 `required-materials.json`
- [ ] 创建字段映射规则文件（`field-rules/*.json`）
  - 提单字段映射
  - 发票字段映射
  - 装箱单字段映射
  - 合同字段映射
  - 报关单字段映射
  - 核注清单字段映射

### 10.3 阶段三：核心功能

- [ ] 实现单据识别器（`material-recognizer.ts`）
- [ ] 实现字段提取器（`field-extractor.ts`）
- [ ] 实现 AI 视觉客户端（`vision-client.ts`）
- [ ] 实现配置加载器（`config/field-mappings.ts`）

### 10.4 阶段四：UI 组件

- [ ] 更新菜单结构（`Sidebar.tsx`）
- [ ] 更新材料清单组件（`MaterialChecklist.tsx`）
- [ ] 实现对比预览组件（`ComparisonPreview.tsx`）
- [ ] 集成到现有流程

### 10.5 阶段五：测试与优化

- [ ] 使用压缩包中的测试单据进行测试
- [ ] 优化识别准确率
- [ ] 优化置信度计算
- [ ] 性能优化（缓存、并发等）

---

## 十一、风险与应对

### 11.1 技术风险

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| AI 识别准确率不足 | 用户需要大量手动修改 | 1. 文件名规则优先<br>2. 持续优化 Prompt<br>3. 收集错误案例改进 |
| PDF 解析失败 | 无法提取内容 | 1. 支持多种 PDF 库<br>2. 降级到 OCR |
| API 成本过高 | 运营成本增加 | 1. 文件名规则优先<br>2. 结果缓存<br>3. 批量处理优化 |
| 处理速度慢 | 用户体验差 | 1. 异步处理<br>2. 进度提示<br>3. 后台队列 |

### 11.2 业务风险

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 字段映射不完整 | 提取数据不可用 | 1. 充分调研实际单据<br>2. 支持自定义字段<br>3. 持续迭代完善 |
| 业务类型遗漏 | 部分场景不支持 | 1. 配置文件易于扩展<br>2. 收集用户反馈<br>3. 逐步覆盖 |
| 数据格式不兼容 | 无法导入申报系统 | 1. 对接单一窗口规范<br>2. 支持自定义格式导出 |

---

## 十二、后续优化方向

### 12.1 短期优化（1-2周）

- [ ] 支持更多单据类型（原产地证、保险单等）
- [ ] 优化 AI Prompt 提高识别准确率
- [ ] 添加字段验证规则（格式检查、逻辑校验）
- [ ] 支持批量上传和处理

### 12.2 中期优化（1-2月）

- [ ] 引入 OCR 支持（扫描件识别）
- [ ] 支持表格自动识别（商品明细）
- [ ] 智能合并多份单据的字段
- [ ] 历史数据学习和优化

### 12.3 长期优化（3-6月）

- [ ] 训练专属模型（提高准确率、降低成本）
- [ ] RPA 自动填报集成
- [ ] 多语言支持（英文、中文等）
- [ ] 移动端支持

---

## 变更历史

| 日期 | 版本 | 变更内容 | 操作人 |
|------|------|----------|--------|
| 2026-01-23 | 1.0 | 初始设计文档 | AI |
