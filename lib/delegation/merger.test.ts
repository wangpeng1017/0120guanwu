/**
 * @file merger.test.ts
 * @desc DataMerger测试
 */

import {
  calculateFilePriority,
  mergeEnterpriseInfo,
  mergeCustomerInfo,
  mergeDeclarationInfo,
  mergeGoodsItems,
  mergeExcelData
} from './merger'
import type { ExtractedData } from './extractor'

describe('calculateFilePriority', () => {
  it('包含核注清单应该获得最高优先级', () => {
    const data: ExtractedData = {
      declaration: {
        supervisionMode: '区内物流货物',
        recordNumber: 'T5165W000469',
        importExportFlag: '进口'
      },
      totalRows: 50
    }

    const priority = calculateFilePriority('test.xls', data)

    expect(priority).toBeGreaterThan(100)
  })

  it('数据更完整应该获得更高优先级', () => {
    const dataComplete: ExtractedData = {
      enterprise: { name: '测试公司', customsCode: '123', socialCreditCode: '456' },
      customers: [{ name: '客户1', customsCode: '789' }],
      goods: [{ goodsName: '商品1', hsCode: '123456', matchKey: 'HS:123456' }],
      totalRows: 100
    }

    const dataPartial: ExtractedData = {
      enterprise: { name: '测试公司2', customsCode: '234', socialCreditCode: '567' },
      totalRows: 50
    }

    const priority1 = calculateFilePriority('complete.xls', dataComplete)
    const priority2 = calculateFilePriority('partial.xls', dataPartial)

    expect(priority1).toBeGreaterThan(priority2)
  })
})

describe('mergeEnterpriseInfo', () => {
  it('应该选择优先级最高的企业信息', () => {
    const dataList = [
      {
        fileName: 'file1.xls',
        priority: 50,
        data: {
          enterprise: { name: '公司A', customsCode: '1111', socialCreditCode: '2222' },
          totalRows: 50
        }
      },
      {
        fileName: 'file2.xls',
        priority: 100,
        data: {
          enterprise: { name: '公司B', customsCode: '3333', socialCreditCode: '4444' },
          totalRows: 100
        }
      }
    ]

    const { result, logs } = mergeEnterpriseInfo(dataList)

    expect(result).toBeDefined()
    expect(result!.name).toBe('公司B')
    expect(logs.length).toBeGreaterThan(0)
    expect(logs[0].sourceFile).toBe('file2.xls')
  })

  it('应该处理只有一个文件的情况', () => {
    const dataList = [
      {
        fileName: 'file1.xls',
        priority: 50,
        data: {
          enterprise: { name: '公司A', customsCode: '1111', socialCreditCode: '2222' },
          totalRows: 50
        }
      }
    ]

    const { result, logs } = mergeEnterpriseInfo(dataList)

    expect(result).toBeDefined()
    expect(result!.name).toBe('公司A')
  })

  it('应该处理没有企业信息的情况', () => {
    const dataList = [
      {
        fileName: 'file1.xls',
        priority: 50,
        data: { totalRows: 50 }
      }
    ]

    const { result } = mergeEnterpriseInfo(dataList)

    expect(result).toBeUndefined()
  })
})

describe('mergeCustomerInfo', () => {
  it('应该按海关编码去重', () => {
    const dataList = [
      {
        fileName: 'file1.xls',
        priority: 50,
        data: {
          customers: [
            { name: '客户A', customsCode: '1111' },
            { name: '客户B', customsCode: '2222' }
          ],
          totalRows: 50
        }
      },
      {
        fileName: 'file2.xls',
        priority: 100,
        data: {
          customers: [
            { name: '客户A-更新', customsCode: '1111' },  // 重复，应该保留优先级高的
            { name: '客户C', customsCode: '3333' }
          ],
          totalRows: 100
        }
      }
    ]

    const { result, logs } = mergeCustomerInfo(dataList)

    expect(result).toBeDefined()
    expect(result!.length).toBe(3)  // 3个不同的客户
    const customer1111 = result!.find(c => c.customsCode === '1111')
    expect(customer1111!.name).toBe('客户A-更新')  // 应该使用优先级高的
  })
})

describe('mergeDeclarationInfo', () => {
  it('应该选择优先级最高的核注清单', () => {
    const dataList = [
      {
        fileName: 'file1.xls',
        priority: 50,
        data: {
          declaration: {
            supervisionMode: '模式A',
            recordNumber: 'T111',
            importExportFlag: '进口'
          },
          totalRows: 50
        }
      },
      {
        fileName: 'file2.xls',
        priority: 100,
        data: {
          declaration: {
            supervisionMode: '模式B',
            recordNumber: 'T222',
            importExportFlag: '出口'
          },
          totalRows: 100
        }
      }
    ]

    const { result, logs } = mergeDeclarationInfo(dataList)

    expect(result).toBeDefined()
    expect(result!.supervisionMode).toBe('模式B')
    expect(result!.recordNumber).toBe('T222')
  })
})

describe('mergeGoodsItems', () => {
  it('应该按HS编码智能匹配合并', () => {
    const dataList = [
      {
        fileName: 'file1.xls',
        priority: 50,
        data: {
          goods: [
            {
              hsCode: '8512201000',
              goodsName: '白炽灯',
              quantity: 1000,
              totalPrice: 100,
              matchKey: 'HS:8512201000'
            },
            {
              hsCode: '8512201001',
              goodsName: '其他灯',
              quantity: 500,
              matchKey: 'HS:8512201001'
            }
          ],
          totalRows: 50
        }
      },
      {
        fileName: 'file2.xls',
        priority: 100,
        data: {
          goods: [
            {
              hsCode: '8512201000',
              goodsName: '机动车辆用白炽灯',  // 同HS编码，应该合并
              quantity: 2000,
              totalPrice: 200,
              origin: '泰国',
              matchKey: 'HS:8512201000'
            }
          ],
          totalRows: 100
        }
      }
    ]

    const { result, logs } = mergeGoodsItems(dataList)

    expect(result).toBeDefined()
    expect(result!.length).toBe(2)  // 2个不同的商品（HS编码匹配后只保留1个）

    const item8512201000 = result!.find(g => g.hsCode === '8512201000')
    expect(item8512201000!.goodsName).toBe('机动车辆用白炽灯')  // 优先级高的
    expect(item8512201000!.quantity).toBe(2000)
    expect(item8512201000!.origin).toBe('泰国')
  })

  it('应该按货号匹配（当HS编码为空时）', () => {
    const dataList = [
      {
        fileName: 'file1.xls',
        priority: 50,
        data: {
          goods: [
            {
              hsCode: '',
              goodsName: '商品A',
              itemCode: 'ABC123',
              quantity: 100,
              matchKey: 'CODE:ABC123'
            }
          ],
          totalRows: 50
        }
      },
      {
        fileName: 'file2.xls',
        priority: 100,
        data: {
          goods: [
            {
              hsCode: '',
              goodsName: '商品A-详细名称',
              itemCode: 'ABC123',  // 同货号
              quantity: 200,
              matchKey: 'CODE:ABC123'
            }
          ],
          totalRows: 100
        }
      }
    ]

    const { result } = mergeGoodsItems(dataList)

    expect(result!.length).toBe(1)  // 货号匹配，合并为1个
    expect(result![0].goodsName).toBe('商品A-详细名称')  // 优先级高的
  })

  it('应该按商品名称匹配（当HS和货号都为空时）', () => {
    const dataList = [
      {
        fileName: 'file1.xls',
        priority: 50,
        data: {
          goods: [
            {
              hsCode: '',
              goodsName: '机动车辆用白炽灯',
              quantity: 100,
              matchKey: 'NAME:机动车辆用白炽灯'
            }
          ],
          totalRows: 50
        }
      },
      {
        fileName: 'file2.xls',
        priority: 100,
        data: {
          goods: [
            {
              hsCode: '',
              goodsName: '机动车辆用白炽灯',  // 同商品名称
              quantity: 200,
              matchKey: 'NAME:机动车辆用白炽灯'
            }
          ],
          totalRows: 100
        }
      }
    ]

    const { result } = mergeGoodsItems(dataList)

    expect(result!.length).toBe(1)  // 名称匹配，合并为1个
    expect(result![0].quantity).toBe(200)  // 优先级高的
  })
})

describe('mergeExcelData', () => {
  it('应该合并多个文件的完整数据', () => {
    const filesData = [
      {
        fileName: 'file1.xls',
        data: {
          enterprise: { name: '公司A', customsCode: '1111', socialCreditCode: '2222' },
          goods: [
            { hsCode: '8512201000', goodsName: '白炽灯', quantity: 1000, matchKey: 'HS:8512201000' }
          ],
          totalRows: 50
        }
      },
      {
        fileName: 'file2.xls',
        data: {
          declaration: {
            supervisionMode: '区内物流货物',
            recordNumber: 'T111',
            importExportFlag: '进口'
          },
          goods: [
            { hsCode: '8512201000', goodsName: '机动车辆用白炽灯', quantity: 2000, matchKey: 'HS:8512201000' }
          ],
          totalRows: 100
        }
      }
    ]

    const merged = mergeExcelData(filesData)

    expect(merged.enterprise).toBeDefined()
    expect(merged.declaration).toBeDefined()
    expect(merged.goods).toBeDefined()
    expect(merged.goods!.length).toBeGreaterThan(0)
    expect(merged.mergeLogs.length).toBeGreaterThan(0)
    expect(merged.sourceFiles).toEqual(['file1.xls', 'file2.xls'])
  })
})
