import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@ai-news/db'
import Anthropic from '@anthropic-ai/sdk'
import { GET, POST } from '@/app/api/chat/conversations/[conversationId]/messages/route'

function createMockRequest(options: {
  method?: string
  url?: string
  body?: unknown
  searchParams?: Record<string, string>
} = {}): NextRequest {
  const url = new URL(
    options.url ?? 'http://localhost:3000/api/chat/conversations/conv_1/messages',
  )
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  return new NextRequest(url, {
    method: options.method ?? 'GET',
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    headers: options.body ? { 'content-type': 'application/json' } : {},
  })
}

function createRouteParams(conversationId: string) {
  return { params: Promise.resolve({ conversationId }) }
}

describe('[Chat] /api/chat/conversations/[conversationId]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('should return 401 when not authenticated', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue({ userId: null } as never)

      // Act
      const request = createMockRequest()
      const response = await GET(request, createRouteParams('conv_1'))

      // Assert
      expect(response.status).toBe(401)
      const json = await response.json()
      expect(json.error).toBe('Unauthorized')
    })

    it('should return 404 when conversation not found', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
      vi.mocked(prisma.chatConversation.findUnique).mockResolvedValue(null)

      // Act
      const request = createMockRequest()
      const response = await GET(request, createRouteParams('conv_nonexistent'))

      // Assert
      expect(response.status).toBe(404)
      const json = await response.json()
      expect(json.error).toBe('Conversation not found')
    })

    it('should return 403 when conversation belongs to different user', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
      vi.mocked(prisma.chatConversation.findUnique).mockResolvedValue({
        userId: 'user_other',
      } as never)

      // Act
      const request = createMockRequest()
      const response = await GET(request, createRouteParams('conv_1'))

      // Assert
      expect(response.status).toBe(403)
      const json = await response.json()
      expect(json.error).toBe('Forbidden')
    })

    it('should return paginated messages', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
      vi.mocked(prisma.chatConversation.findUnique).mockResolvedValue({
        userId: 'user_123',
      } as never)

      const mockMessages = [
        { id: 'msg_1', conversationId: 'conv_1', role: 'user', content: 'Hello', tokensUsed: 0, createdAt: new Date() },
        { id: 'msg_2', conversationId: 'conv_1', role: 'assistant', content: 'Hi!', tokensUsed: 15, createdAt: new Date() },
      ]
      vi.mocked(prisma.chatMessage.findMany).mockResolvedValue(mockMessages as never)
      vi.mocked(prisma.chatMessage.count).mockResolvedValue(2)

      // Act
      const request = createMockRequest({ searchParams: { skip: '0', take: '50' } })
      const response = await GET(request, createRouteParams('conv_1'))

      // Assert
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.data).toHaveLength(2)
      expect(json.total).toBe(2)
      expect(json.skip).toBe(0)
      expect(json.take).toBe(50)
    })

    it('should return 400 on invalid pagination params', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
      vi.mocked(prisma.chatConversation.findUnique).mockResolvedValue({
        userId: 'user_123',
      } as never)

      // Act
      const request = createMockRequest({ searchParams: { take: '0' } })
      const response = await GET(request, createRouteParams('conv_1'))

      // Assert
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('Validation error')
    })
  })

  describe('POST', () => {
    it('should return 401 when not authenticated', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue({ userId: null } as never)

      // Act
      const request = createMockRequest({
        method: 'POST',
        body: { content: 'Hello' },
      })
      const response = await POST(request, createRouteParams('conv_1'))

      // Assert
      expect(response.status).toBe(401)
      const json = await response.json()
      expect(json.error).toBe('Unauthorized')
    })

    it('should return 404 when conversation not found', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
      vi.mocked(prisma.chatConversation.findUnique).mockResolvedValue(null)

      // Act
      const request = createMockRequest({
        method: 'POST',
        body: { content: 'Hello' },
      })
      const response = await POST(request, createRouteParams('conv_nonexistent'))

      // Assert
      expect(response.status).toBe(404)
      const json = await response.json()
      expect(json.error).toBe('Conversation not found')
    })

    it('should return 403 when conversation belongs to different user', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
      vi.mocked(prisma.chatConversation.findUnique).mockResolvedValue({
        id: 'conv_1',
        userId: 'user_other',
        article: {
          originalTitle: 'Test',
          titleFr: null,
          titleEn: null,
          originalContent: 'content',
          summaryFr: null,
          summaryEn: null,
          url: 'https://example.com',
        },
      } as never)

      // Act
      const request = createMockRequest({
        method: 'POST',
        body: { content: 'Hello' },
      })
      const response = await POST(request, createRouteParams('conv_1'))

      // Assert
      expect(response.status).toBe(403)
      const json = await response.json()
      expect(json.error).toBe('Forbidden')
    })

    it('should return 429 when daily message limit reached', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
      vi.mocked(prisma.chatConversation.findUnique).mockResolvedValue({
        id: 'conv_1',
        userId: 'user_123',
        article: {
          originalTitle: 'Test Article',
          titleFr: null,
          titleEn: null,
          originalContent: 'content',
          summaryFr: null,
          summaryEn: null,
          url: 'https://example.com',
        },
      } as never)
      // pro plan: 50 messages/day
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        plan: 'pro',
        status: 'active',
      } as never)
      vi.mocked(prisma.chatMessage.count).mockResolvedValue(50)
      vi.mocked(prisma.aiCreditUsage.aggregate).mockResolvedValue({
        _sum: { tokensUsed: 1000 },
      } as never)

      // Act
      const request = createMockRequest({
        method: 'POST',
        body: { content: 'Hello' },
      })
      const response = await POST(request, createRouteParams('conv_1'))

      // Assert
      expect(response.status).toBe(429)
      const json = await response.json()
      expect(json.error).toBe('Daily message limit reached')
    })

    it('should return 429 when monthly token limit reached', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
      vi.mocked(prisma.chatConversation.findUnique).mockResolvedValue({
        id: 'conv_1',
        userId: 'user_123',
        article: {
          originalTitle: 'Test Article',
          titleFr: null,
          titleEn: null,
          originalContent: 'content',
          summaryFr: null,
          summaryEn: null,
          url: 'https://example.com',
        },
      } as never)
      // pro plan: 100_000 tokens/month
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        plan: 'pro',
        status: 'active',
      } as never)
      vi.mocked(prisma.chatMessage.count).mockResolvedValue(5)
      vi.mocked(prisma.aiCreditUsage.aggregate).mockResolvedValue({
        _sum: { tokensUsed: 100_000 },
      } as never)

      // Act
      const request = createMockRequest({
        method: 'POST',
        body: { content: 'Hello' },
      })
      const response = await POST(request, createRouteParams('conv_1'))

      // Assert
      expect(response.status).toBe(429)
      const json = await response.json()
      expect(json.error).toBe('Monthly token limit reached')
    })

    it('should return 400 on invalid body (missing content)', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)

      // Act
      const request = createMockRequest({
        method: 'POST',
        body: {},
      })
      const response = await POST(request, createRouteParams('conv_1'))

      // Assert
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('Validation error')
    })

    it('should return 400 on invalid body (empty content)', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)

      // Act
      const request = createMockRequest({
        method: 'POST',
        body: { content: '' },
      })
      const response = await POST(request, createRouteParams('conv_1'))

      // Assert
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('Validation error')
    })

    it('should return SSE stream on success', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
      vi.mocked(prisma.chatConversation.findUnique).mockResolvedValue({
        id: 'conv_1',
        userId: 'user_123',
        article: {
          originalTitle: 'Test Article',
          titleFr: 'Article Test',
          titleEn: null,
          originalContent: 'Some AI content',
          summaryFr: 'Resume en francais',
          summaryEn: null,
          url: 'https://example.com/article',
        },
      } as never)
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        plan: 'pro',
        status: 'active',
      } as never)
      vi.mocked(prisma.chatMessage.count).mockResolvedValue(5)
      vi.mocked(prisma.aiCreditUsage.aggregate).mockResolvedValue({
        _sum: { tokensUsed: 1000 },
      } as never)
      vi.mocked(prisma.chatMessage.create).mockResolvedValue({} as never)
      vi.mocked(prisma.chatMessage.findMany).mockResolvedValue([
        { role: 'user', content: 'Hello' },
      ] as never)
      vi.mocked(prisma.$transaction).mockResolvedValue([] as never)

      // Mock Anthropic streaming response
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { type: 'message_start', message: { usage: { input_tokens: 10 } } }
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } }
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: ' world' } }
          yield { type: 'message_delta', usage: { output_tokens: 5 } }
        },
      }

      const mockCreate = vi.fn().mockResolvedValue(mockStream)
      vi.mocked(Anthropic).mockImplementation(
        () =>
          ({
            messages: { create: mockCreate },
          }) as unknown as Anthropic,
      )

      // Act
      const request = createMockRequest({
        method: 'POST',
        body: { content: 'Hello' },
      })
      const response = await POST(request, createRouteParams('conv_1'))

      // Assert
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      expect(response.headers.get('Cache-Control')).toBe('no-cache')

      // Read the stream
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let done = false

      while (!done) {
        const result = await reader.read()
        done = result.done
        if (result.value) {
          fullText += decoder.decode(result.value, { stream: true })
        }
      }

      // Verify SSE events were sent
      expect(fullText).toContain('"type":"text"')
      expect(fullText).toContain('"text":"Hello"')
      expect(fullText).toContain('"text":" world"')
      expect(fullText).toContain('"type":"done"')

      // Verify Anthropic was called with correct params
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          stream: true,
        }),
      )

      // Verify user message was saved
      expect(prisma.chatMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            conversationId: 'conv_1',
            role: 'user',
            content: 'Hello',
          }),
        }),
      )

      // Verify transaction was called to save assistant message + update conversation + log usage
      expect(prisma.$transaction).toHaveBeenCalled()
    })

    it('should handle content exceeding max length', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)

      // Act
      const request = createMockRequest({
        method: 'POST',
        body: { content: 'a'.repeat(4001) }, // max 4000
      })
      const response = await POST(request, createRouteParams('conv_1'))

      // Assert
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('Validation error')
    })
  })
})
