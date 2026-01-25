/**
 * @file parser.test.ts
 * @desc ExcelParser测试
 */

import { classifySheet, calculateFilePriority, parseExcelFile, SheetClassification } from './parser'

describe('classifySheet', () => {
  describe('精确名称匹配', () => {
    it('应该识别"企业"sheet为enterprise类型', () => {
      const result = classifySheet('企业', [
        ['加工单位名称', '加工单位编码'],
        ['广东合捷国际供应链有限公司', '4430635001']
      ])
      
      expect(result.type).toBe('enterprise')
      expect(result.confidence).toBe(1.0)
      expect(result.dataRows).toBe(2)
    })
    
    it('应该识别"客户供应商"sheet为customer类型', () => {
      const result = classifySheet('客户供应商', [
        ['单位名称', '单位代码'],
        ['测试公司', '1234567890']
      ])
      
      expect(result.type).toBe('customer')
      expect(result.confidence).toBe(1.0)
    })
    
    it('应该识别"核注清单"sheet为declaration类型', () => {
      const result = classifySheet('核注清单', [
        ['监管方式', '备案编号'],
        ['区内物流货物', 'T5165W000469']
      ])
      
      expect(result.type).toBe('declaration')
      expect(result.confidence).toBe(1.0)
    })
  })
  
  describe('模糊名称匹配', () => {
    it('应该识别包含"发票"的sheet为invoice类型', () => {
      const result = classifySheet('发票&箱单（必填）', [
        ['HS编码', '总价'],
        ['8512201000', '189.88']
      ])
      
      expect(result.type).toBe('invoice')
      expect(result.confidence).toBe(0.9)
    })
    
    it('应该识别包含"装箱"的sheet为packing类型', () => {
      const result = classifySheet('装箱明细', [
        ['净重', '毛重'],
        ['100', '120']
      ])
      
      expect(result.type).toBe('packing')
      expect(result.confidence).toBe(0.9)
    })
  })
  
  describe('字段内容匹配', () => {
    it('应该通过字段识别企业信息sheet', () => {
      const result = classifySheet('Sheet1', [
        ['其他字段', '加工单位编码', '加工单位名称'],
        ['数据', '4430635001', '广东合捷']
      ])
      
      expect(result.type).toBe('enterprise')
      expect(result.confidence).toBe(0.8)
    })
    
    it('应该通过字段识别发票sheet', () => {
      const result = classifySheet('Sheet2', [
        ['商品名称', 'HS编码', '总价'],
        ['白炽灯', '8512201000', '189.88']
      ])
      
      expect(result.type).toBe('invoice')
      expect(result.confidence).toBe(0.7)
    })
  })
  
  describe('边缘情况', () => {
    it('应该处理空数据', () => {
      const result = classifySheet('空Sheet', [])
      
      expect(result.type).toBe('unknown')
      expect(result.dataRows).toBe(0)
    })
    
    it('应该处理未知类型', () => {
      const result = classifySheet('随机Sheet', [
        ['无关字段1', '无关字段2'],
        ['数据1', '数据2']
      ])
      
      expect(result.type).toBe('unknown')
      expect(result.confidence).toBe(0)
    })
    
    it('应该过滤空行', () => {
      const result = classifySheet('企业', [
        ['加工单位名称'],
        ['广东合捷'],
        ['', ''],  // 空行
        [null, null],  // 空行
        ['更多数据']
      ])
      
      expect(result.dataRows).toBe(3)  // 只计算非空行
    })
  })
})

describe('calculateFilePriority', () => {
  it('包含核注清单应该获得最高优先级', () => {
    const sheets: SheetClassification[] = [
      { type: 'enterprise', confidence: 1.0, sheetName: '企业', dataRows: 10 },
      { type: 'declaration', confidence: 1.0, sheetName: '核注清单', dataRows: 50 }
    ]
    
    const priority = calculateFilePriority(sheets)
    
    expect(priority).toBeGreaterThan(100)  // 至少100分
  })
  
  it('更多已识别sheet应该获得更高分数', () => {
    const fewSheets: SheetClassification[] = [
      { type: 'enterprise', confidence: 1.0, sheetName: '企业', dataRows: 10 }
    ]
    
    const manySheets: SheetClassification[] = [
      { type: 'enterprise', confidence: 1.0, sheetName: '企业', dataRows: 10 },
      { type: 'customer', confidence: 1.0, sheetName: '客户', dataRows: 10 },
      { type: 'invoice', confidence: 0.9, sheetName: '发票', dataRows: 20 }
    ]
    
    const priority1 = calculateFilePriority(fewSheets)
    const priority2 = calculateFilePriority(manySheets)
    
    expect(priority2).toBeGreaterThan(priority1)
  })
  
  it('更多数据行应该获得更高分数', () => {
    const smallData: SheetClassification[] = [
      { type: 'enterprise', confidence: 1.0, sheetName: '企业', dataRows: 10 }
    ]
    
    const largeData: SheetClassification[] = [
      { type: 'enterprise', confidence: 1.0, sheetName: '企业', dataRows: 500 }
    ]
    
    const priority1 = calculateFilePriority(smallData)
    const priority2 = calculateFilePriority(largeData)
    
    expect(priority2).toBeGreaterThan(priority1)
  })
  
  it('应该处理空数组', () => {
    const priority = calculateFilePriority([])
    expect(priority).toBe(0)
  })
})

describe('parseExcelFile', () => {
  it('应该解析真实的汽车类Excel文件', () => {
    const XLSX = require('xlsx')
    const filePath = '/Users/wangpeng/Downloads/0122guanwu/新增测试单据类型/口岸进出口清关/汽车_口岸出口清关/20260106 迪拜海运 比亚迪9 XM20251230123001/合捷汽车箱单发票模板（合捷贸易）-比亚迪9.xls'
    
    const workbook = XLSX.readFile(filePath)
    const result = parseExcelFile('汽车测试.xls', workbook)
    
    expect(result.fileName).toBe('汽车测试.xls')
    expect(result.sheets.length).toBeGreaterThan(0)
    expect(result.priority).toBeGreaterThan(0)
    
    // 应该识别出企业、客户、发票等sheet
    const sheetTypes = result.sheets.map(s => s.type)
    expect(sheetTypes).toContain('enterprise')
    expect(sheetTypes).toContain('declaration')
  })
})
