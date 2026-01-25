/**
 * @file mapper.test.ts
 * @desc DelegationMapper测试
 */

import {
  mapToDelegationLetter,
  mapToDelegationAgreements,
  mapDelegationData
} from './mapper'
import type { MergedData } from './merger'

describe('mapToDelegationLetter', () => {
  it('应该正确映射企业和客户信息到委托书', () => {
    const data: MergedData = {
      enterprise: {
        name: '广东合捷国际供应链有限公司',
        customsCode: '4430635001',
        socialCreditCode: '91440000663381756E',
        legalPerson: '关小文',
        phone: '02039082683'
      },
      customers: [
        {
          name: '深圳XX贸易公司',
          customsCode: '1234567890',
          socialCreditCode: '91XXXXXX',
          englishName: 'Shenzhen XX Trading'
        }
      ],
      totalRows: 100,
      mergeLogs: [],
      sourceFiles: ['test.xls']
    }

    const { result, warnings } = mapToDelegationLetter(data)

    // 委托方（客户）信息
    expect(result.clientCompanyName).toBe('深圳XX贸易公司')
    expect(result.clientCustomsCode).toBe('1234567890')
    expect(result.clientSocialCreditCode).toBe('91XXXXXX')

    // 被委托方（报关企业）信息
    expect(result.agentCompanyName).toBe('广东合捷国际供应链有限公司')
    expect(result.agentCustomsCode).toBe('4430635001')
    expect(result.agentSocialCreditCode).toBe('91440000663381756E')
    expect(result.agentAuthorizedSigner).toBe('关小文')
    expect(result.agentContactPhone).toBe('02039082683')

    // 默认值
    expect(result.delegationType).toBe('long-term')
    expect(result.validityPeriod).toBe('12')
    expect(result.delegationContent.length).toBeGreaterThan(0)
  })

  it('应该处理缺少客户信息的情况', () => {
    const data: MergedData = {
      enterprise: {
        name: '广东合捷国际供应链有限公司',
        customsCode: '4430635001',
        socialCreditCode: '91440000663381756E'
      },
      totalRows: 50,
      mergeLogs: [],
      sourceFiles: ['test.xls']
    }

    const { result, warnings } = mapToDelegationLetter(data)

    expect(warnings.length).toBeGreaterThan(0)
    expect(warnings.some(w => w.includes('客户信息'))).toBe(true)
  })

  it('应该处理多个客户的情况（选择第一个）', () => {
    const data: MergedData = {
      enterprise: {
        name: '广东合捷',
        customsCode: '111',
        socialCreditCode: '222'
      },
      customers: [
        { name: '客户A', customsCode: '1111' },
        { name: '客户B', customsCode: '2222' }
      ],
      totalRows: 100,
      mergeLogs: [],
      sourceFiles: ['test.xls']
    }

    const { result, warnings } = mapToDelegationLetter(data)

    expect(result.clientCompanyName).toBe('客户A')
    expect(warnings.some(w => w.includes('多个客户'))).toBe(true)
  })
})

describe('mapToDelegationAgreements', () => {
  it('应该将每个商品映射为一条委托协议', () => {
    const data: MergedData = {
      goods: [
        {
          hsCode: '8512201000',
          goodsName: '机动车辆用白炽灯',
          quantity: 2000,
          totalPrice: 189.88,
          origin: '泰国',
          matchKey: 'HS:8512201000'
        },
        {
          hsCode: '8512201001',
          goodsName: '其他灯具',
          quantity: 1500,
          totalPrice: 142.41,
          origin: '中国',
          matchKey: 'HS:8512201001'
        }
      ],
      declaration: {
        supervisionMode: '区内物流货物',
        recordNumber: 'T5165W000469',
        importExportFlag: '进口',
        entryDate: '2025-01-25'
      },
      totalRows: 100,
      mergeLogs: [],
      sourceFiles: ['test.xls']
    }

    const { result, warnings } = mapToDelegationAgreements(data)

    expect(result.length).toBe(2)

    // 第一条协议
    expect(result[0].serialNumber).toBe(1)
    expect(result[0].mainGoodsName).toBe('机动车辆用白炽灯')
    expect(result[0].hsCode).toBe('8512201000')
    expect(result[0].totalValue).toBe(189.88)
    expect(result[0].currency).toBe('USD')  // 默认值
    expect(result[0].tradeMode).toBe('区内物流货物')
    expect(result[0].originPlace).toBe('泰国')
    expect(result[0].importExportDate).toBe('2025-01-25')

    // 第二条协议
    expect(result[1].serialNumber).toBe(2)
    expect(result[1].mainGoodsName).toBe('其他灯具')
    expect(result[1].hsCode).toBe('8512201001')
  })

  it('应该处理没有商品的情况', () => {
    const data: MergedData = {
      totalRows: 50,
      mergeLogs: [],
      sourceFiles: ['test.xls']
    }

    const { result, warnings } = mapToDelegationAgreements(data)

    expect(result).toEqual([])
    expect(warnings.some(w => w.includes('商品'))).toBe(true)
  })

  it('应该处理缺少核注清单的情况（使用当前日期）', () => {
    const data: MergedData = {
      goods: [
        {
          hsCode: '8512201000',
          goodsName: '测试商品',
          totalPrice: 100,
          matchKey: 'HS:8512201000'
        }
      ],
      totalRows: 50,
      mergeLogs: [],
      sourceFiles: ['test.xls']
    }

    const { result, warnings } = mapToDelegationAgreements(data)

    expect(result.length).toBe(1)
    expect(result[0].importExportDate).toBeTruthy()  // 应该有默认日期
    expect(result[0].tradeMode).toBe('一般贸易')  // 默认值
  })
})

describe('mapDelegationData', () => {
  it('应该完整映射所有数据', () => {
    const data: MergedData = {
      enterprise: {
        name: '广东合捷国际供应链有限公司',
        customsCode: '4430635001',
        socialCreditCode: '91440000663381756E'
      },
      customers: [
        { name: '深圳XX贸易公司', customsCode: '1234567890' }
      ],
      goods: [
        {
          hsCode: '8512201000',
          goodsName: '白炽灯',
          quantity: 1000,
          totalPrice: 100,
          matchKey: 'HS:8512201000'
        }
      ],
      declaration: {
        supervisionMode: '区内物流货物',
        recordNumber: 'T111',
        importExportFlag: '进口',
        entryDate: '2025-01-25'
      },
      totalRows: 100,
      mergeLogs: [],
      sourceFiles: ['test.xls']
    }

    const result = mapDelegationData(data)

    expect(result.delegationLetter).toBeDefined()
    expect(result.delegationAgreements).toBeDefined()
    expect(result.delegationAgreements.length).toBe(1)
    expect(result.warnings).toBeDefined()
  })
})
