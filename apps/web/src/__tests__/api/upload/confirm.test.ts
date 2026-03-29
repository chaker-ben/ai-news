import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@ai-news/db'
import { POST } from '@/app/api/upload/confirm/route'

function createMockRequest(options: {
  method?: string
  url?: string
  body?: unknown
  searchParams?: Record<string, string>
} = {}): NextRequest {
  const url = new URL(options.url ?? 'http://localhost:3000/api/upload/confirm')
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  return new NextRequest(url, {
    method: options.method ?? 'GET',
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    headers: options.body ? { 'content-type': 'application/json' } : {},
  })
}

const validBody = {
  articleId: 'art_1',
  key: 'articles/user_123/art_1/12345-photo.jpg',
  url: 'https://cdn.example.com/articles/user_123/art_1/12345-photo.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 5_000_000,
  type: 'image' as const,
}

describe('[Upload Confirm] POST /api/upload/confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never)

    const request = createMockRequest({ method: 'POST', body: validBody })
    const response = await POST(request)

    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('should return 404 when article not found', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
    vi.mocked(prisma.article.findUnique).mockResolvedValue(null)

    const request = createMockRequest({ method: 'POST', body: validBody })
    const response = await POST(request)

    expect(response.status).toBe(404)
    const json = await response.json()
    expect(json.error).toBe('Article not found')
  })

  it('should return 403 when user does not own article', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
    vi.mocked(prisma.article.findUnique).mockResolvedValue({
      id: 'art_1',
      authorId: 'user_other',
    } as never)

    const request = createMockRequest({ method: 'POST', body: validBody })
    const response = await POST(request)

    expect(response.status).toBe(403)
    const json = await response.json()
    expect(json.error).toBe('Forbidden')
  })

  it('should return 201 with created media record', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
    vi.mocked(prisma.article.findUnique).mockResolvedValue({
      id: 'art_1',
      authorId: 'user_123',
    } as never)
    vi.mocked(prisma.articleMedia.count).mockResolvedValue(2)

    const createdMedia = {
      id: 'media_1',
      articleId: 'art_1',
      type: 'image',
      url: validBody.url,
      key: validBody.key,
      size: validBody.sizeBytes,
      mimeType: validBody.mimeType,
      order: 3,
    }
    vi.mocked(prisma.articleMedia.create).mockResolvedValue(createdMedia as never)

    const request = createMockRequest({ method: 'POST', body: validBody })
    const response = await POST(request)

    expect(response.status).toBe(201)
    const json = await response.json()
    expect(json.data).toEqual(createdMedia)
  })

  it('should set order = existingCount + 1', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
    vi.mocked(prisma.article.findUnique).mockResolvedValue({
      id: 'art_1',
      authorId: 'user_123',
    } as never)
    vi.mocked(prisma.articleMedia.count).mockResolvedValue(5)
    vi.mocked(prisma.articleMedia.create).mockResolvedValue({ id: 'media_1' } as never)

    const request = createMockRequest({ method: 'POST', body: validBody })
    await POST(request)

    expect(prisma.articleMedia.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        order: 6,
      }),
    })
  })

  it('should return 400 on invalid body', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)

    const request = createMockRequest({
      method: 'POST',
      body: { articleId: 'art_1' }, // missing key, url, mimeType, sizeBytes, type
    })
    const response = await POST(request)

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('Validation error')
    expect(json.details).toBeDefined()
  })
})
