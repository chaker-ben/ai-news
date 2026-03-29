import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@ai-news/db'
import { GET, POST } from '@/app/api/chat/conversations/route'

function createMockRequest(options: {
  method?: string
  url?: string
  body?: unknown
  searchParams?: Record<string, string>
} = {}): NextRequest {
  const url = new URL(options.url ?? 'http://localhost:3000/api/chat/conversations')
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  return new NextRequest(url, {
    method: options.method ?? 'GET',
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    headers: options.body ? { 'content-type': 'application/json' } : {},
  })
}

describe('[Chat] /api/chat/conversations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('should return 401 when not authenticated', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue({ userId: null } as never)

      // Act
      const request = createMockRequest()
      const response = await GET(request)

      // Assert
      expect(response.status).toBe(401)
      const json = await response.json()
      expect(json.error).toBe('Unauthorized')
    })

    it('should return paginated list of conversations', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)

      const mockConversations = [
        {
          id: 'conv_1',
          userId: 'user_123',
          title: 'Test conversation',
          article: { id: 'art_1', originalTitle: 'AI Article', titleFr: null, titleEn: null, thumbnailUrl: null },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
      vi.mocked(prisma.chatConversation.findMany).mockResolvedValue(mockConversations as never)
      vi.mocked(prisma.chatConversation.count).mockResolvedValue(1)

      // Act
      const request = createMockRequest({ searchParams: { skip: '0', take: '10' } })
      const response = await GET(request)

      // Assert
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.data).toHaveLength(1)
      expect(json.total).toBe(1)
      expect(json.skip).toBe(0)
      expect(json.take).toBe(10)
    })

    it('should use default pagination when no params provided', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
      vi.mocked(prisma.chatConversation.findMany).mockResolvedValue([])
      vi.mocked(prisma.chatConversation.count).mockResolvedValue(0)

      // Act
      const request = createMockRequest()
      const response = await GET(request)

      // Assert
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.skip).toBe(0)
      expect(json.take).toBe(20) // default
    })

    it('should return 400 on invalid pagination params', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)

      // Act
      const request = createMockRequest({ searchParams: { skip: '-1' } })
      const response = await GET(request)

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
        body: { articleId: 'art_1' },
      })
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(401)
      const json = await response.json()
      expect(json.error).toBe('Unauthorized')
    })

    it('should return 403 when free plan (chat not allowed)', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null) // free plan

      // Act
      const request = createMockRequest({
        method: 'POST',
        body: { articleId: 'art_1' },
      })
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(403)
      const json = await response.json()
      expect(json.error).toContain('not available')
    })

    it('should return 404 when article not found', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        plan: 'pro',
        status: 'active',
      } as never)
      vi.mocked(prisma.article.findUnique).mockResolvedValue(null)

      // Act
      const request = createMockRequest({
        method: 'POST',
        body: { articleId: 'art_nonexistent' },
      })
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(404)
      const json = await response.json()
      expect(json.error).toBe('Article not found')
    })

    it('should return 201 with created conversation for pro user', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        plan: 'pro',
        status: 'active',
      } as never)
      vi.mocked(prisma.article.findUnique).mockResolvedValue({
        id: 'art_1',
        originalTitle: 'AI News Article',
        titleFr: 'Article IA',
      } as never)

      const mockConversation = {
        id: 'conv_new',
        userId: 'user_123',
        articleId: 'art_1',
        title: 'Article IA',
        article: {
          id: 'art_1',
          originalTitle: 'AI News Article',
          titleFr: 'Article IA',
          titleEn: null,
          thumbnailUrl: null,
        },
      }
      vi.mocked(prisma.chatConversation.create).mockResolvedValue(mockConversation as never)

      // Act
      const request = createMockRequest({
        method: 'POST',
        body: { articleId: 'art_1' },
      })
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(201)
      const json = await response.json()
      expect(json.data.id).toBe('conv_new')
      expect(json.data.title).toBe('Article IA')
    })

    it('should return 400 on invalid body (missing articleId)', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)

      // Act
      const request = createMockRequest({
        method: 'POST',
        body: {},
      })
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('Validation error')
    })

    it('should return 400 on invalid body (empty articleId)', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)

      // Act
      const request = createMockRequest({
        method: 'POST',
        body: { articleId: '' },
      })
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('Validation error')
    })
  })
})
