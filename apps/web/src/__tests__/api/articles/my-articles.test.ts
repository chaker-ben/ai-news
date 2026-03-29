import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@ai-news/db'
import { GET } from '@/app/api/articles/my/route'

function createMockRequest(options: {
  method?: string
  url?: string
  body?: unknown
  searchParams?: Record<string, string>
} = {}): NextRequest {
  const url = new URL(options.url ?? 'http://localhost:3000/api/articles/my')
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  return new NextRequest(url, {
    method: options.method ?? 'GET',
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    headers: options.body ? { 'content-type': 'application/json' } : {},
  })
}

describe('[My Articles] GET /api/articles/my', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never)

    const request = createMockRequest()
    const response = await GET(request)

    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('should return paginated list with total and hasMore', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)

    const mockArticles = [
      { id: 'art_1', status: 'draft', media: [], _count: { media: 0 } },
      { id: 'art_2', status: 'published', media: [], _count: { media: 2 } },
    ]
    vi.mocked(prisma.article.findMany).mockResolvedValue(mockArticles as never)
    vi.mocked(prisma.article.count).mockResolvedValue(25)

    const request = createMockRequest()
    const response = await GET(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data).toEqual(mockArticles)
    expect(json.pagination).toEqual({
      total: 25,
      skip: 0,
      take: 20,
      hasMore: true,
    })
  })

  it('should filter by status', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
    vi.mocked(prisma.article.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.article.count).mockResolvedValue(0)

    const request = createMockRequest({ searchParams: { status: 'published' } })
    await GET(request)

    expect(prisma.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          authorId: 'user_123',
          isUserGenerated: true,
          status: 'published',
        }),
      }),
    )
  })

  it('should use default pagination (skip=0, take=20)', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
    vi.mocked(prisma.article.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.article.count).mockResolvedValue(0)

    const request = createMockRequest()
    await GET(request)

    expect(prisma.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 20,
      }),
    )
  })

  it('should return hasMore=false when all items fit', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)

    const mockArticles = [{ id: 'art_1', media: [], _count: { media: 0 } }]
    vi.mocked(prisma.article.findMany).mockResolvedValue(mockArticles as never)
    vi.mocked(prisma.article.count).mockResolvedValue(1)

    const request = createMockRequest()
    const response = await GET(request)

    const json = await response.json()
    expect(json.pagination.hasMore).toBe(false)
  })

  it('should respect custom pagination params', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
    vi.mocked(prisma.article.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.article.count).mockResolvedValue(50)

    const request = createMockRequest({ searchParams: { skip: '10', take: '5' } })
    await GET(request)

    expect(prisma.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 5,
      }),
    )
  })
})
