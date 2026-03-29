import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@ai-news/db'
import { GET, POST } from '@/app/api/articles/publish/route'

function createMockRequest(options: {
  method?: string
  url?: string
  body?: unknown
  searchParams?: Record<string, string>
} = {}): NextRequest {
  const url = new URL(options.url ?? 'http://localhost:3000/api/articles/publish')
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  return new NextRequest(url, {
    method: options.method ?? 'GET',
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    headers: options.body ? { 'content-type': 'application/json' } : {},
  })
}

describe('[Articles Publish] /api/articles/publish', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as never)

      const request = createMockRequest()
      const response = await GET(request)

      expect(response.status).toBe(401)
      const json = await response.json()
      expect(json.error).toBe('Unauthorized')
    })

    it('should return list of user articles', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)

      const mockArticles = [
        { id: 'art_1', authorId: 'user_123', status: 'draft', media: [] },
        { id: 'art_2', authorId: 'user_123', status: 'published', media: [] },
      ]
      vi.mocked(prisma.article.findMany).mockResolvedValue(mockArticles as never)

      const request = createMockRequest()
      const response = await GET(request)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.data).toEqual(mockArticles)
    })

    it('should filter by status query param', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
      vi.mocked(prisma.article.findMany).mockResolvedValue([] as never)

      const request = createMockRequest({ searchParams: { status: 'draft' } })
      await GET(request)

      expect(prisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            authorId: 'user_123',
            isUserGenerated: true,
            status: 'draft',
          }),
        }),
      )
    })
  })

  describe('POST', () => {
    const validBody = {
      title: 'My new article',
      content: 'Article content here',
      language: 'fr' as const,
    }

    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as never)

      const request = createMockRequest({ method: 'POST', body: validBody })
      const response = await POST(request)

      expect(response.status).toBe(401)
      const json = await response.json()
      expect(json.error).toBe('Unauthorized')
    })

    it('should return 403 when free plan (publish not allowed)', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null) // no subscription = free

      const request = createMockRequest({ method: 'POST', body: validBody })
      const response = await POST(request)

      expect(response.status).toBe(403)
      const json = await response.json()
      expect(json.error).toContain('plan does not allow publishing')
    })

    it('should return 403 when monthly limit reached', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        plan: 'pro',
        status: 'active',
      } as never)
      // pro plan limit = 5
      vi.mocked(prisma.article.count).mockResolvedValue(5)

      const request = createMockRequest({ method: 'POST', body: validBody })
      const response = await POST(request)

      expect(response.status).toBe(403)
      const json = await response.json()
      expect(json.error).toContain('Monthly article limit reached')
    })

    it('should return 201 with created draft article', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        plan: 'pro',
        status: 'active',
      } as never)
      vi.mocked(prisma.article.count).mockResolvedValue(2)

      const createdArticle = {
        id: 'art_new',
        authorId: 'user_123',
        status: 'draft',
        originalTitle: validBody.title,
        titleFr: validBody.title,
        media: [],
      }
      vi.mocked(prisma.article.create).mockResolvedValue(createdArticle as never)

      const request = createMockRequest({ method: 'POST', body: validBody })
      const response = await POST(request)

      expect(response.status).toBe(201)
      const json = await response.json()
      expect(json.data).toEqual(createdArticle)
    })

    it('should set titleFr when language is fr', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        plan: 'pro',
        status: 'active',
      } as never)
      vi.mocked(prisma.article.count).mockResolvedValue(0)
      vi.mocked(prisma.article.create).mockResolvedValue({ id: 'art_1' } as never)

      const request = createMockRequest({
        method: 'POST',
        body: { title: 'Mon article', language: 'fr' },
      })
      await POST(request)

      expect(prisma.article.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            titleFr: 'Mon article',
          }),
        }),
      )
    })

    it('should set titleEn when language is en', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        plan: 'pro',
        status: 'active',
      } as never)
      vi.mocked(prisma.article.count).mockResolvedValue(0)
      vi.mocked(prisma.article.create).mockResolvedValue({ id: 'art_1' } as never)

      const request = createMockRequest({
        method: 'POST',
        body: { title: 'My article', language: 'en' },
      })
      await POST(request)

      expect(prisma.article.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            titleEn: 'My article',
          }),
        }),
      )
    })

    it('should set titleAr when language is ar', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        plan: 'pro',
        status: 'active',
      } as never)
      vi.mocked(prisma.article.count).mockResolvedValue(0)
      vi.mocked(prisma.article.create).mockResolvedValue({ id: 'art_1' } as never)

      const request = createMockRequest({
        method: 'POST',
        body: { title: 'مقالتي', language: 'ar' },
      })
      await POST(request)

      expect(prisma.article.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            titleAr: 'مقالتي',
          }),
        }),
      )
    })

    it('should return 400 on invalid body', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)

      const request = createMockRequest({
        method: 'POST',
        body: { language: 'invalid_lang' }, // missing title, invalid language
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('Validation error')
      expect(json.details).toBeDefined()
    })
  })
})
