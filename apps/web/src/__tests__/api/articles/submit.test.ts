import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@ai-news/db'
import { POST } from '@/app/api/articles/publish/[articleId]/submit/route'

function createMockRequest(options: {
  method?: string
  url?: string
  body?: unknown
  searchParams?: Record<string, string>
} = {}): NextRequest {
  const url = new URL(options.url ?? 'http://localhost:3000/api/articles/publish/art_1/submit')
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  return new NextRequest(url, {
    method: options.method ?? 'GET',
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    headers: options.body ? { 'content-type': 'application/json' } : {},
  })
}

const makeParams = (articleId: string) => Promise.resolve({ articleId })

const draftArticle = {
  id: 'art_1',
  authorId: 'user_123',
  status: 'draft',
  originalTitle: 'My Article',
  originalContent: 'Some meaningful content here.',
}

describe('[Articles Submit] POST /api/articles/publish/[articleId]/submit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never)

    const request = createMockRequest({ method: 'POST' })
    const response = await POST(request, { params: makeParams('art_1') })

    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('should return 404 when article not found', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
    vi.mocked(prisma.article.findUnique).mockResolvedValue(null)

    const request = createMockRequest({ method: 'POST' })
    const response = await POST(request, { params: makeParams('art_999') })

    expect(response.status).toBe(404)
    const json = await response.json()
    expect(json.error).toBe('Article not found')
  })

  it('should return 403 when user does not own article', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
    vi.mocked(prisma.article.findUnique).mockResolvedValue({
      ...draftArticle,
      authorId: 'user_other',
    } as never)

    const request = createMockRequest({ method: 'POST' })
    const response = await POST(request, { params: makeParams('art_1') })

    expect(response.status).toBe(403)
    const json = await response.json()
    expect(json.error).toBe('Forbidden')
  })

  it('should return 400 when article is not draft', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
    vi.mocked(prisma.article.findUnique).mockResolvedValue({
      ...draftArticle,
      status: 'published',
    } as never)

    const request = createMockRequest({ method: 'POST' })
    const response = await POST(request, { params: makeParams('art_1') })

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('Only draft articles can be submitted')
  })

  it('should return 400 when article has no title', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
    vi.mocked(prisma.article.findUnique).mockResolvedValue({
      ...draftArticle,
      originalTitle: '',
    } as never)

    const request = createMockRequest({ method: 'POST' })
    const response = await POST(request, { params: makeParams('art_1') })

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('Article must have a title before submitting')
  })

  it('should return 400 when article has no content', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
    vi.mocked(prisma.article.findUnique).mockResolvedValue({
      ...draftArticle,
      originalContent: '',
    } as never)

    const request = createMockRequest({ method: 'POST' })
    const response = await POST(request, { params: makeParams('art_1') })

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('Article must have content before submitting')
  })

  it('should set status to pending_review for pro plan', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
    vi.mocked(prisma.article.findUnique).mockResolvedValue(draftArticle as never)
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      plan: 'pro',
      status: 'active',
    } as never)

    const updatedArticle = { ...draftArticle, status: 'pending_review', media: [] }
    vi.mocked(prisma.article.update).mockResolvedValue(updatedArticle as never)

    const request = createMockRequest({ method: 'POST' })
    const response = await POST(request, { params: makeParams('art_1') })

    expect(response.status).toBe(200)
    expect(prisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'pending_review',
        }),
      }),
    )
    // Should NOT set publishedAt
    const updateCall = vi.mocked(prisma.article.update).mock.calls[0][0]
    expect(updateCall.data).not.toHaveProperty('publishedAt')
  })

  it('should set status to published with publishedAt for team plan', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
    vi.mocked(prisma.article.findUnique).mockResolvedValue(draftArticle as never)
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      plan: 'team',
      status: 'active',
    } as never)

    const updatedArticle = { ...draftArticle, status: 'published', media: [] }
    vi.mocked(prisma.article.update).mockResolvedValue(updatedArticle as never)

    const request = createMockRequest({ method: 'POST' })
    const response = await POST(request, { params: makeParams('art_1') })

    expect(response.status).toBe(200)
    expect(prisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'published',
          publishedAt: expect.any(Date),
        }),
      }),
    )
  })

  it('should set status to published for enterprise plan', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
    vi.mocked(prisma.article.findUnique).mockResolvedValue(draftArticle as never)
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      plan: 'enterprise',
      status: 'active',
    } as never)

    const updatedArticle = { ...draftArticle, status: 'published', media: [] }
    vi.mocked(prisma.article.update).mockResolvedValue(updatedArticle as never)

    const request = createMockRequest({ method: 'POST' })
    const response = await POST(request, { params: makeParams('art_1') })

    expect(response.status).toBe(200)
    expect(prisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'published',
          publishedAt: expect.any(Date),
        }),
      }),
    )
  })
})
