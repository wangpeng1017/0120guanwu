/**
 * @file extractor.test.ts
 * @desc DataExtractor测试
 */

import {
  extractEnterpriseInfo,
  extractCustomerInfo,
  extractDeclarationInfo,
  extractGoodsItems,
  findHeaderRow,
  findColumnIndex,
  generateMatchKey,
  extractDataFromFile,
  FIELD_ALIASES
} from './extractor'
import { parseExcelFile } from './parser'

describe('findColumnIndex', () => {
  it('应该找到精确匹配的列', () => {
    const headers = ['序号', 'HS编码', '商品名称', '数量']
    const index = findColumnIndex(headers, FIELD_ALIASES.hsCode)
    
    expect(index).toBe(1)
  })
  
  it('应该找到别名匹配的列', () => {
    const headers = ['序号', '商品HS编码', '品名']
    const index = findColumnIndex(headers, FIELD_ALIASES.hsCode)
    
    expect(index).toBe(1)
  })
  
  it('应该处理大小写不敏感', () => {
    const headers = ['序号', 'hs code', 'description']
    const hsIndex = findColumnIndex(headers, FIELD_ALIASES.hsCode)
    const nameIndex = findColumnIndex(headers, FIELD_ALIASES.goodsName)
    
    expect(hsIndex).toBe(1)
    expect(nameIndex).toBe(2)
  })
  
  it('未找到时应该返回-1', () => {
    const headers = ['无关字段1', '无关字段2']
    const index = findColumnIndex(headers, FIELD_ALIASES.hsCode)
    
    expect(index).toBe(-1)
  })
})

describe('findHeaderRow', () => {
  it('应该找到包含关键字段的行', () => {
    const data = [
      ['标题行'],
      ['说明文字'],
      ['序号', 'HS编码', '商品名称', '数量'],  // 这是表头
      ['1', '8512201000', '白炽灯', '2000']
    ]
    
    const headerRow = findHeaderRow(data, ['HS编码', '商品名称'])
    
    expect(headerRow).toBe(2)
  })
  
  it('应该在前20行内查找', () => {
    const data = Array(25).fill(['无关数据'])
    data[15] = ['序号', 'HS编码', '商品名称']
    
    const headerRow = findHeaderRow(data, ['HS编码', '商品名称'])
    
    expect(headerRow).toBe(15)
  })
  
  it('未找到时应该返回0', () => {
    const data = [
      ['无关字段1', '无关字段2'],
      ['数据1', '数据2']
    ]
    
    const headerRow = findHeaderRow(data, ['HS编码', '商品名称'])
    
    expect(headerRow).toBe(0)
  })
})

describe('generateMatchKey', () => {
  it('应该优先使用HS编码作为匹配键', () => {
    const item = {
      hsCode: '8512201000',
      goodsName: '白炽灯',
      itemCode: 'ABC123'
    }
    
    const key = generateMatchKey(item)
    
    expect(key).toBe('HS:8512201000')
  })
  
  it('HS编码为空时应该使用货号', () => {
    const item = {
      hsCode: '',
      goodsName: '白炽灯',
      itemCode: 'ABC123'
    }
    
    const key = generateMatchKey(item)
    
    expect(key).toBe('CODE:ABC123')
  })
  
  it('都为空时应该使用商品名称', () => {
    const item = {
      goodsName: '机动车辆用白炽灯'
    }
    
    const key = generateMatchKey(item)
    
    expect(key).toBe('NAME:机动车辆用白炽灯')
  })
  
  it('应该处理undefined值', () => {
    const item = {
      hsCode: undefined,
      goodsName: '测试商品'
    }
    
    const key = generateMatchKey(item)
    
    expect(key).toBe('NAME:测试商品')
  })
})

describe('extractEnterpriseInfo', () => {
  it('应该提取企业信息（标准格式）', () => {
    const data = [
      ['加工单位编码', '加工单位名称', '加工单位三证合一代码', '加工单位法人代表', '加工单位联系电话'],
      ['4430635001', '广东合捷国际供应链有限公司', '91440000663381756E', '关小文', '02039082683']
    ]
    
    const info = extractEnterpriseInfo(data)
    
    expect(info).not.toBeNull()
    expect(info!.customsCode).toBe('4430635001')
    expect(info!.name).toBe('广东合捷国际供应链有限公司')
    expect(info!.socialCreditCode).toBe('91440000663381756E')
    expect(info!.legalPerson).toBe('关小文')
    expect(info!.phone).toBe('02039082683')
  })
  
  it('应该处理空数据', () => {
    const info = extractEnterpriseInfo([])
    
    expect(info).toBeNull()
  })
  
  it('应该处理缺少部分字段', () => {
    const data = [
      ['加工单位名称', '加工单位编码'],
      ['测试公司', '1234567890']
    ]
    
    const info = extractEnterpriseInfo(data)
    
    expect(info).not.toBeNull()
    expect(info!.name).toBe('测试公司')
    expect(info!.customsCode).toBe('1234567890')
    expect(info!.socialCreditCode).toBe('')
  })
})

describe('extractCustomerInfo', () => {
  it('应该提取客户供应商信息', () => {
    const data = [
      ['单位代码', '单位名称', '单位英文名'],
      ['1234567890', '深圳XX贸易公司', 'Shenzhen XX Trading'],
      ['0987654321', '广州YY公司', 'Guangzhou YY']
    ]
    
    const customers = extractCustomerInfo(data)
    
    expect(customers).toHaveLength(2)
    expect(customers[0].customsCode).toBe('1234567890')
    expect(customers[0].name).toBe('深圳XX贸易公司')
    expect(customers[1].customsCode).toBe('0987654321')
  })
  
  it('应该处理空数据', () => {
    const customers = extractCustomerInfo([])
    
    expect(customers).toEqual([])
  })
})

describe('extractDeclarationInfo', () => {
  it('应该提取核注清单信息', () => {
    const data = [
      ['监管方式', '备案编号', '进出口标志', '录入日期', '经营单位名称', '经营单位代码'],
      ['区内物流货物', 'T5165W000469', '进口', '2025-01-25', '测试公司', '1234567890']
    ]
    
    const info = extractDeclarationInfo(data)
    
    expect(info).not.toBeNull()
    expect(info!.supervisionMode).toBe('区内物流货物')
    expect(info!.recordNumber).toBe('T5165W000469')
    expect(info!.importExportFlag).toBe('进口')
  })
  
  it('应该处理空数据', () => {
    const info = extractDeclarationInfo([])
    
    expect(info).toBeNull()
  })
})

describe('extractGoodsItems', () => {
  it('应该提取发票商品明细', () => {
    const data = [
      ['说明文字'],
      ['序号', 'HS编码', '商品名称', '数量', '单位', '单价', '总价', '原产国'],
      ['1', '8512201000', '机动车辆用白炽灯', '2000', '个', '0.0949', '189.88', '泰国'],
      ['2', '8512201000', '机动车辆用白炽灯', '1500', '个', '0.0949', '142.41', '泰国']
    ]
    
    const items = extractGoodsItems(data, 'invoice')
    
    expect(items).toHaveLength(2)
    expect(items[0].hsCode).toBe('8512201000')
    expect(items[0].goodsName).toBe('机动车辆用白炽灯')
    expect(items[0].quantity).toBe(2000)
    expect(items[0].totalPrice).toBe(189.88)
    expect(items[0].origin).toBe('泰国')
    expect(items[0].matchKey).toBe('HS:8512201000')
  })
  
  it('应该过滤空行和无效数据', () => {
    const data = [
      ['序号', 'HS编码', '商品名称'],
      ['1', '8512201000', '白炽灯'],
      ['', '', ''],  // 空行
      ['合计', '', ''],  // 汇总行
      ['2', '8512201001', '其他灯具']
    ]
    
    const items = extractGoodsItems(data, 'invoice')
    
    expect(items).toHaveLength(2)
    expect(items[0].hsCode).toBe('8512201000')
    expect(items[1].hsCode).toBe('8512201001')
  })
  
  it('应该处理电商格式（表头在第9行）', () => {
    const data = Array(8).fill(['说明文字'])
    data.push(['序号', 'HS编码', '商品名称', '数量'])
    data.push(['1', '2106909090', 'VIVANUTRIA小球藻片', '3000'])
    
    const items = extractGoodsItems(data, 'invoice')
    
    expect(items).toHaveLength(1)
    expect(items[0].hsCode).toBe('2106909090')
  })
})

describe('extractDataFromFile', () => {
  it('应该从真实Excel文件提取完整数据', () => {
    const XLSX = require('xlsx')

    const filePath = '/Users/wangpeng/Downloads/0122guanwu/新增测试单据类型/综保区进出区清关/灯具1-综保区进出清关业务/一线进仓/OAPAC20251205AM 2650354819 泰国海运柜货/2650354819-广东合捷国际供应链有限公司-进口-【欧司朗一线进口-装箱单发票-模板1】-19295-20251231.xls'

    const workbook = XLSX.readFile(filePath)
    const parsedFile = parseExcelFile('灯具测试.xls', workbook)
    
    const extracted = extractDataFromFile(workbook, parsedFile)
    
    // 应该提取到企业信息
    expect(extracted.enterprise).toBeDefined()
    expect(extracted.enterprise!.name).toBe('广东合捷国际供应链有限公司')
    
    // 应该提取到核注清单
    expect(extracted.declaration).toBeDefined()
    expect(extracted.declaration!.supervisionMode).toBeTruthy()
    
    // 应该提取到商品明细
    expect(extracted.goods).toBeDefined()
    expect(extracted.goods!.length).toBeGreaterThan(0)
  })
})
