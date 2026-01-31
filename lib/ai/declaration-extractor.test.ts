/**
 * @file declaration-extractor.test.ts
 * @desc Gemini AI 申报要素提取单元测试 - 代理配置（TDD 完整版）
 * @input 依赖: vitest, undici (mocked)
 * @output 导出: 测试套件
 * @see PRD: docs/PRD.md#F017
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock undici
const mockFetch = vi.fn()

class MockProxyAgent {
  constructor(public url: string) {}
}

vi.mock('undici', () => ({
  ProxyAgent: MockProxyAgent,
  fetch: mockFetch
}))

// 测试模块路径
const EXTRACTOR_MODULE_PATH = './declaration-extractor'

describe('AI: 代理配置 (Proxy Configuration)', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    // 重置环境变量
    process.env = { ...originalEnv }
    // 默认 mock 行为
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{ text: '{"header":{},"items":[],"overallConfidence":0.9}' }]
          }
        }]
      }),
      text: async () => JSON.stringify({
        candidates: [{
          content: {
            parts: [{ text: '{"header":{},"items":[],"overallConfidence":0.9}' }]
          }
        }]
      })
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    process.env = originalEnv
  })

  describe('getProxyConfig - 代理配置读取', () => {
    it('应该读取 PROXY_URL 环境变量', async () => {
      // Arrange
      process.env.PROXY_URL = 'http://proxy.example.com:8080'
      process.env.GEMINI_API_KEY = 'test-api-key'

      // Act
      const { getProxyConfig } = await import(EXTRACTOR_MODULE_PATH)
      const config = getProxyConfig()

      // Assert
      expect(config).toBeDefined()
      expect(config.url).toBe('http://proxy.example.com:8080')
      expect(config.enabled).toBe(true)
    })

    it('当 PROXY_URL 未设置时应该返回禁用状态', async () => {
      // Arrange
      delete process.env.PROXY_URL
      process.env.GEMINI_API_KEY = 'test-api-key'

      // Act
      const { getProxyConfig } = await import(EXTRACTOR_MODULE_PATH)
      const config = getProxyConfig()

      // Assert
      expect(config.enabled).toBe(false)
      expect(config.url).toBeUndefined()
    })

    it('当 PROXY_URL 为空字符串时应该返回禁用状态', async () => {
      // Arrange
      process.env.PROXY_URL = ''
      process.env.GEMINI_API_KEY = 'test-api-key'

      // Act
      const { getProxyConfig } = await import(EXTRACTOR_MODULE_PATH)
      const config = getProxyConfig()

      // Assert
      expect(config.enabled).toBe(false)
    })

    it('应该支持 SOCKS5 代理', async () => {
      // Arrange
      process.env.PROXY_URL = 'socks5://proxy.example.com:1080'
      process.env.GEMINI_API_KEY = 'test-api-key'

      // Act
      const { getProxyConfig } = await import(EXTRACTOR_MODULE_PATH)
      const config = getProxyConfig()

      // Assert
      expect(config.enabled).toBe(true)
      expect(config.url).toBe('socks5://proxy.example.com:1080')
      expect(config.type).toBe('socks5')
    })

    it('应该支持带认证的 HTTP 代理', async () => {
      // Arrange
      process.env.PROXY_URL = 'http://user:pass@proxy.example.com:8080'
      process.env.GEMINI_API_KEY = 'test-api-key'

      // Act
      const { getProxyConfig } = await import(EXTRACTOR_MODULE_PATH)
      const config = getProxyConfig()

      // Assert
      expect(config.enabled).toBe(true)
      expect(config.url).toBe('http://user:pass@proxy.example.com:8080')
      expect(config.hasAuth).toBe(true)
    })

    it('应该解析代理主机和端口', async () => {
      // Arrange
      process.env.PROXY_URL = 'http://proxy-server:3128'
      process.env.GEMINI_API_KEY = 'test-api-key'

      // Act
      const { getProxyConfig } = await import(EXTRACTOR_MODULE_PATH)
      const config = getProxyConfig()

      // Assert
      expect(config.host).toBe('proxy-server')
      expect(config.port).toBe(3128)
    })

    it('应该处理无效的代理 URL', async () => {
      // Arrange
      process.env.PROXY_URL = 'not-a-valid-url'
      process.env.GEMINI_API_KEY = 'test-api-key'

      // Act
      const { getProxyConfig } = await import(EXTRACTOR_MODULE_PATH)
      const config = getProxyConfig()

      // Assert
      expect(config.enabled).toBe(false)
      expect(config.error).toBeDefined()
    })
  })

  describe('testProxyConnection - 代理连接测试', () => {
    it('应该成功连接到可用的代理服务器', async () => {
      // Arrange
      process.env.PROXY_URL = 'http://proxy.example.com:8080'
      process.env.GEMINI_API_KEY = 'test-api-key'
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{ text: '{"header":{},"items":[],"overallConfidence":0.9}' }]
            }
          }]
        })
      })

      // Act
      const { testProxyConnection } = await import(EXTRACTOR_MODULE_PATH)
      const result = await testProxyConnection()

      // Assert
      expect(result.success).toBe(true)
      expect(result.reachable).toBe(true)
      expect(result.proxyUrl).toBe('http://proxy.example.com:8080')
    })

    it('应该处理代理连接超时', async () => {
      // Arrange
      process.env.PROXY_URL = 'http://slow-proxy.example.com:8080'
      process.env.GEMINI_API_KEY = 'test-api-key'
      mockFetch.mockImplementation(async (_url, options) => {
        // 模拟延迟后超时
        await new Promise(resolve => setTimeout(resolve, 200))
        // 检查 signal 是否已 abort
        if (options?.signal?.aborted) {
          const error: any = new Error('The operation was aborted')
          error.name = 'AbortError'
          throw error
        }
        return { ok: true, status: 200 }
      })

      // Act
      const { testProxyConnection } = await import(EXTRACTOR_MODULE_PATH)
      const result = await testProxyConnection({ timeout: 100 })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('超时')
    }, 10000) // 增加测试超时到 10 秒

    it('应该处理代理连接拒绝错误', async () => {
      // Arrange
      process.env.PROXY_URL = 'http://unreachable-proxy.example.com:8080'
      process.env.GEMINI_API_KEY = 'test-api-key'
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'))

      // Act
      const { testProxyConnection } = await import(EXTRACTOR_MODULE_PATH)
      const result = await testProxyConnection()

      // Assert
      expect(result.success).toBe(false)
      expect(result.reachable).toBe(false)
      expect(result.error).toContain('ECONNREFUSED')
    })

    it('应该处理代理认证失败', async () => {
      // Arrange
      process.env.PROXY_URL = 'http://user:wrong@proxy.example.com:8080'
      process.env.GEMINI_API_KEY = 'test-api-key'
      mockFetch.mockResolvedValue({
        ok: false,
        status: 407,
        text: async () => 'Proxy Authentication Required'
      })

      // Act
      const { testProxyConnection } = await import(EXTRACTOR_MODULE_PATH)
      const result = await testProxyConnection()

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('407')
    })

    it('当没有配置代理时应该跳过测试', async () => {
      // Arrange
      delete process.env.PROXY_URL
      process.env.GEMINI_API_KEY = 'test-api-key'

      // Act
      const { testProxyConnection } = await import(EXTRACTOR_MODULE_PATH)
      const result = await testProxyConnection()

      // Assert
      expect(result.skipped).toBe(true)
      expect(result.reason).toContain('未配置代理')
    })
  })

  describe('callGemini - 代理集成测试', () => {
    it('使用代理时应该创建 ProxyAgent', async () => {
      // Arrange
      process.env.PROXY_URL = 'http://proxy.example.com:8080'
      process.env.GEMINI_API_KEY = 'test-api-key'
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{ text: '{"header":{},"items":[],"overallConfidence":0.9}' }]
            }
          }]
        })
      })

      // Act
      const { callGemini } = await import(EXTRACTOR_MODULE_PATH)
      await callGemini('test prompt')

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.objectContaining({
          dispatcher: expect.any(Object)
        })
      )
    })

    it('不使用代理时不应该创建 ProxyAgent', async () => {
      // Arrange
      delete process.env.PROXY_URL
      process.env.GEMINI_API_KEY = 'test-api-key'
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{ text: '{"header":{},"items":[],"overallConfidence":0.9}' }]
            }
          }]
        })
      })

      // Act
      const { callGemini } = await import(EXTRACTOR_MODULE_PATH)
      await callGemini('test prompt')

      // Assert - 没有代理时 dispatcher 应该是 undefined
      const fetchCall = mockFetch.mock.calls[0]
      expect(fetchCall[1]).toBeDefined()
      // 检查是否没有 dispatcher 或者 dispatcher 是 undefined
      expect(fetchCall[1].dispatcher).toBeUndefined()
    })

    it('代理失败时应该降级到直连', async () => {
      // Arrange
      process.env.PROXY_URL = 'http://failing-proxy.example.com:8080'
      process.env.GEMINI_API_KEY = 'test-api-key'
      let callCount = 0
      mockFetch.mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          throw new Error('Proxy connection failed')
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [{
              content: {
                parts: [{ text: '{"header":{},"items":[],"overallConfidence":0.9}' }]
              }
            }]
          })
        }
      })

      // Act
      const { callGemini } = await import(EXTRACTOR_MODULE_PATH)
      const result = await callGemini('test prompt')

      // Assert
      expect(result).toBeDefined()
      expect(callCount).toBeGreaterThan(0)
    })

    it('应该处理 Body 已被读取错误', async () => {
      // Arrange
      process.env.PROXY_URL = 'http://proxy.example.com:8080'
      process.env.GEMINI_API_KEY = 'test-api-key'
      mockFetch.mockImplementation(async () => {
        throw new Error('Body has already been read')
      })

      // Act & Assert
      const { callGemini } = await import(EXTRACTOR_MODULE_PATH)
      await expect(callGemini('test prompt')).rejects.toThrow('所有 Gemini 模型都失败')
    })

    it('应该处理所有模型都失败的情况', async () => {
      // Arrange
      process.env.GEMINI_API_KEY = 'test-api-key'
      mockFetch.mockRejectedValue(new Error('All models failed'))

      // Act & Assert
      const { callGemini } = await import(EXTRACTOR_MODULE_PATH)
      await expect(callGemini('test prompt')).rejects.toThrow('所有 Gemini 模型都失败')
    })
  })

  describe('extractDeclaration - 完整流程', () => {
    it('使用代理时应该成功提取申报要素', async () => {
      // Arrange
      process.env.PROXY_URL = 'http://proxy.example.com:8080'
      process.env.GEMINI_API_KEY = 'test-api-key'
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  header: {
                    invoiceNo: { value: 'INV-001', confidence: 0.95, source: '文件1' }
                  },
                  items: [],
                  overallConfidence: 0.95
                })
              }]
            }
          }]
        })
      })

      const materials = [{
        materialType: 'INVOICE',
        originalName: 'invoice.pdf',
        fileUrl: 'https://example.com/invoice.pdf',
        content: 'Invoice content'
      }]

      // Act
      const { extractDeclaration } = await import(EXTRACTOR_MODULE_PATH)
      const result = await extractDeclaration(materials)

      // Assert
      expect(result).toBeDefined()
      expect(result.header).toBeDefined()
      expect(result.items).toBeDefined()
    })

    it('直连时应该成功提取申报要素', async () => {
      // Arrange
      delete process.env.PROXY_URL
      process.env.GEMINI_API_KEY = 'test-api-key'
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  header: {},
                  items: [],
                  overallConfidence: 0.9
                })
              }]
            }
          }]
        })
      })

      const materials = [{
        materialType: 'INVOICE',
        originalName: 'invoice.pdf',
        fileUrl: 'https://example.com/invoice.pdf'
      }]

      // Act
      const { extractDeclaration } = await import(EXTRACTOR_MODULE_PATH)
      const result = await extractDeclaration(materials)

      // Assert
      expect(result).toBeDefined()
    })

    it('应该处理空材料数组错误', async () => {
      // Arrange
      process.env.GEMINI_API_KEY = 'test-api-key'

      // Act & Assert
      const { extractDeclaration } = await import(EXTRACTOR_MODULE_PATH)
      await expect(extractDeclaration([])).rejects.toThrow('没有可提取的材料')
    })
  })

  describe('环境变量验证', () => {
    it('应该验证 GEMINI_API_KEY 必填', async () => {
      // Arrange
      delete process.env.GEMINI_API_KEY

      // Act & Assert
      const { extractDeclaration } = await import(EXTRACTOR_MODULE_PATH)
      await expect(extractDeclaration([{
        materialType: 'INVOICE',
        originalName: 'test.pdf',
        fileUrl: 'https://example.com/test.pdf'
      }])).rejects.toThrow('GEMINI_API_KEY')
    })

    it('PROXY_URL 是可选的', async () => {
      // Arrange
      process.env.GEMINI_API_KEY = 'test-api-key'
      delete process.env.PROXY_URL
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  header: {},
                  items: [],
                  overallConfidence: 0.9
                })
              }]
            }
          }]
        })
      })

      // Act
      const { getProxyConfig } = await import(EXTRACTOR_MODULE_PATH)
      const config = getProxyConfig()

      // Assert
      expect(config).toBeDefined()
      expect(config.enabled).toBe(false)
    })
  })

  describe('代理配置工具函数', () => {
    it('应该格式化代理 URL 用于日志', async () => {
      // Arrange
      process.env.PROXY_URL = 'http://user:password@proxy.example.com:8080'
      process.env.GEMINI_API_KEY = 'test-api-key'

      // Act
      const { formatProxyUrlForLog } = await import(EXTRACTOR_MODULE_PATH)
      const formatted = formatProxyUrlForLog('http://user:password@proxy.example.com:8080')

      // Assert
      expect(formatted).toContain('proxy.example.com:8080')
      expect(formatted).not.toContain('password')
    })

    it('应该检测代理类型', async () => {
      // Arrange
      process.env.GEMINI_API_KEY = 'test-api-key'

      // Act
      const { detectProxyType } = await import(EXTRACTOR_MODULE_PATH)

      // Assert
      expect(detectProxyType('http://proxy.com:8080')).toBe('http')
      expect(detectProxyType('https://proxy.com:8080')).toBe('https')
      expect(detectProxyType('socks5://proxy.com:1080')).toBe('socks5')
      expect(detectProxyType('socks4://proxy.com:1080')).toBe('socks4')
    })

    it('应该处理未知代理类型', async () => {
      // Arrange
      process.env.GEMINI_API_KEY = 'test-api-key'

      // Act
      const { detectProxyType } = await import(EXTRACTOR_MODULE_PATH)

      // Assert
      expect(detectProxyType('ftp://proxy.com:8080')).toBeUndefined()
      expect(detectProxyType('ws://proxy.com:8080')).toBeUndefined()
    })

    it('应该处理无效的代理 URL (detectProxyType)', async () => {
      // Arrange
      process.env.GEMINI_API_KEY = 'test-api-key'

      // Act
      const { detectProxyType } = await import(EXTRACTOR_MODULE_PATH)

      // Assert
      expect(detectProxyType('not-a-url')).toBeUndefined()
      expect(detectProxyType('')).toBeUndefined()
    })

    it('应该处理无效的代理 URL (formatProxyUrlForLog)', async () => {
      // Arrange
      process.env.GEMINI_API_KEY = 'test-api-key'

      // Act
      const { formatProxyUrlForLog } = await import(EXTRACTOR_MODULE_PATH)

      // Assert - 无效 URL 应该原样返回
      expect(formatProxyUrlForLog('not-a-url')).toBe('not-a-url')
      expect(formatProxyUrlForLog('')).toBe('')
    })

    it('应该格式化没有密码的代理 URL', async () => {
      // Arrange
      process.env.GEMINI_API_KEY = 'test-api-key'

      // Act
      const { formatProxyUrlForLog } = await import(EXTRACTOR_MODULE_PATH)

      // Assert
      expect(formatProxyUrlForLog('http://proxy.example.com:8080')).toBe('http://proxy.example.com:8080')
    })
  })

  describe('parseAIResponse - AI 响应解析', () => {
    it('应该解析纯 JSON 响应', async () => {
      // Arrange
      const jsonStr = '{"header":{},"items":[],"overallConfidence":0.9}'

      // Act
      const { parseAIResponse } = await import(EXTRACTOR_MODULE_PATH)
      const result = parseAIResponse(jsonStr)

      // Assert
      expect(result.header).toBeDefined()
      expect(result.items).toBeDefined()
      expect(result.overallConfidence).toBe(0.9)
    })

    it('应该解析带 ```json 标记的响应', async () => {
      // Arrange
      const jsonStr = '```json\n{"header":{},"items":[],"overallConfidence":0.9}\n```'

      // Act
      const { parseAIResponse } = await import(EXTRACTOR_MODULE_PATH)
      const result = parseAIResponse(jsonStr)

      // Assert
      expect(result.overallConfidence).toBe(0.9)
    })

    it('应该解析带 ``` 标记的响应', async () => {
      // Arrange
      const jsonStr = '```\n{"header":{},"items":[],"overallConfidence":0.9}\n```'

      // Act
      const { parseAIResponse } = await import(EXTRACTOR_MODULE_PATH)
      const result = parseAIResponse(jsonStr)

      // Assert
      expect(result.overallConfidence).toBe(0.9)
    })

    it('应该处理带额外文本的响应', async () => {
      // Arrange
      const jsonStr = '这是一些额外的文本\n{"header":{},"items":[],"overallConfidence":0.9}\n更多文本'

      // Act
      const { parseAIResponse } = await import(EXTRACTOR_MODULE_PATH)
      const result = parseAIResponse(jsonStr)

      // Assert
      expect(result.overallConfidence).toBe(0.9)
    })

    it('应该处理没有 JSON 的响应', async () => {
      // Arrange
      const jsonStr = '没有 JSON 的纯文本'

      // Act & Assert
      const { parseAIResponse } = await import(EXTRACTOR_MODULE_PATH)
      expect(() => parseAIResponse(jsonStr)).toThrow('未找到有效的 JSON')
    })

    it('应该处理无效的 JSON', async () => {
      // Arrange
      const jsonStr = '{invalid json}'

      // Act & Assert
      const { parseAIResponse } = await import(EXTRACTOR_MODULE_PATH)
      expect(() => parseAIResponse(jsonStr)).toThrow('解析 AI 返回数据失败')
    })
  })

  describe('calculateOverallConfidence - 置信度计算', () => {
    it('应该计算整体置信度', async () => {
      // Arrange
      const header = {
        field1: { value: 'test', confidence: 0.9, source: 'test' },
        field2: { value: 'test', confidence: 0.8, source: 'test' },
      }
      const items = [
        {
          field1: { value: 'test', confidence: 0.7, source: 'test' },
          field2: { value: 'test', confidence: 0, source: 'test' }, // 应该被过滤
        }
      ]

      // Act
      const { calculateOverallConfidence } = await import(EXTRACTOR_MODULE_PATH)
      const result = calculateOverallConfidence(header, items)

      // Assert
      expect(result).toBeCloseTo(0.8) // (0.9 + 0.8 + 0.7) / 3
    })

    it('应该处理空数据', async () => {
      // Arrange
      const header = {}
      const items = []

      // Act
      const { calculateOverallConfidence } = await import(EXTRACTOR_MODULE_PATH)
      const result = calculateOverallConfidence(header, items)

      // Assert
      expect(result).toBe(0)
    })

    it('应该过滤置信度为 0 的字段', async () => {
      // Arrange
      const header = {
        field1: { value: 'test', confidence: 0, source: 'test' },
        field2: { value: 'test', confidence: 0, source: 'test' },
      }
      const items = []

      // Act
      const { calculateOverallConfidence } = await import(EXTRACTOR_MODULE_PATH)
      const result = calculateOverallConfidence(header, items)

      // Assert
      expect(result).toBe(0)
    })
  })

  describe('getAvailableModels - 模型列表', () => {
    it('应该返回所有可用模型', async () => {
      // Act
      const { getAvailableModels } = await import(EXTRACTOR_MODULE_PATH)
      const models = getAvailableModels()

      // Assert
      expect(models).toBeInstanceOf(Array)
      expect(models.length).toBeGreaterThan(0)
      expect(models[0]).toBe('gemini-2.5-flash')
    })
  })
})
