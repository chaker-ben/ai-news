import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@ai-news/db'
import {
  validateMediaType,
  validateMediaSize,
  createPresignedUploadUrl,
} from '@/lib/upload'
import { POST } from '@/app/api/upload/presign/route'

function createMockRequest(options: {
  method?: string
  url?: string
  body?: unknown
  searchParams?: Record<string, string>
} = {}): NextRequest {
  const url = new URL(options.url ?? 'http://localhost:3000/api/upload/presign')
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
  filename: 'photo.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 5_000_000,
  category: 'image' as const,
}

describe('[Upload Presign] POST /api/upload/presign', () => {
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

  it('should return 403 when user does not own the article', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
    vi.mocked(prisma.article.findUnique).mockResolvedValue({
      id: 'art_1',
      authorId: 'user_other',
      media: [],
    } as never)

    const request = createMockRequest({ method: 'POST', body: validBody })
    const response = await POST(request)

    expect(response.status).toBe(403)
    const json = await response.json()
    expect(json.error).toBe('Forbidden')
  })

  it('should return 400 on invalid mimeType', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
    vi.mocked(prisma.article.findUnique).mockResolvedValue({
      id: 'art_1',
      authorId: 'user_123',
      media: [],
    } as never)
    vi.mocked(validateMediaType).mockReturnValue({ valid: false, error: 'Invalid file type' })

    const request = createMockRequest({
      method: 'POST',
      body: { ...validBody, mimeType: 'text/plain' },
    })
    const response = await POST(request)

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('Invalid file type')
  })

  it('should return 400 on file too large', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
    vi.mocked(prisma.article.findUnique).mockResolvedValue({
      id: 'art_1',
      authorId: 'user_123',
      media: [],
    } as never)
    vi.mocked(validateMediaType).mockReturnValue({ valid: true })
    vi.mocked(validateMediaSize).mockReturnValue({ valid: false, error: 'File too large' })

    const request = createMockRequest({
      method: 'POST',
      body: { ...validBody, sizeBytes: 999_999_999 },
    })
    const response = await POST(request)

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('File too large')
  })

  it('should return 403 when image limit reached', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
    vi.mocked(prisma.article.findUnique).mockResolvedValue({
      id: 'art_1',
      authorId: 'user_123',
      media: [{ type: 'image' }, { type: 'image' }, { type: 'image' }],
    } as never)
    vi.mocked(validateMediaType).mockReturnValue({ valid: true })
    vi.mocked(validateMediaSize).mockReturnValue({ valid: true })
    // pro plan has max_images_per_article = 3
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      plan: 'pro',
      status: 'active',
    } as never)

    const request = createMockRequest({ method: 'POST', body: validBody })
    const response = await POST(request)

    expect(response.status).toBe(403)
    const json = await response.json()
    expect(json.error).toContain('Maximum')
    expect(json.error).toContain('images')
  })

  it('should return 403 when video limit reached', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
    vi.mocked(prisma.article.findUnique).mockResolvedValue({
      id: 'art_1',
      authorId: 'user_123',
      media: [{ type: 'video' }],
    } as never)
    vi.mocked(validateMediaType).mockReturnValue({ valid: true })
    vi.mocked(validateMediaSize).mockReturnValue({ valid: true })
    // pro plan has max_videos_per_article = 1
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      plan: 'pro',
      status: 'active',
    } as never)

    const request = createMockRequest({
      method: 'POST',
      body: { ...validBody, category: 'video', mimeType: 'video/mp4' },
    })
    const response = await POST(request)

    expect(response.status).toBe(403)
    const json = await response.json()
    expect(json.error).toContain('Maximum')
    expect(json.error).toContain('videos')
  })

  it('should return presigned URL on success', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
    vi.mocked(prisma.article.findUnique).mockResolvedValue({
      id: 'art_1',
      authorId: 'user_123',
      media: [{ type: 'image' }, { type: 'image' }],
    } as never)
    vi.mocked(validateMediaType).mockReturnValue({ valid: true })
    vi.mocked(validateMediaSize).mockReturnValue({ valid: true })
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      plan: 'pro',
      status: 'active',
    } as never)
    vi.mocked(createPresignedUploadUrl).mockResolvedValue({
      uploadUrl: 'https://r2.example.com/presigned',
      key: 'articles/user_123/art_1/12345-photo.jpg',
      publicUrl: 'https://cdn.example.com/articles/user_123/art_1/12345-photo.jpg',
    })

    const request = createMockRequest({ method: 'POST', body: validBody })
    const response = await POST(request)

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data).toEqual({
      uploadUrl: 'https://r2.example.com/presigned',
      key: 'articles/user_123/art_1/12345-photo.jpg',
      publicUrl: 'https://cdn.example.com/articles/user_123/art_1/12345-photo.jpg',
    })
  })

  it('should return 400 on invalid body (missing required fields)', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)

    const request = createMockRequest({
      method: 'POST',
      body: { articleId: 'art_1' }, // missing filename, mimeType, sizeBytes, category
    })
    const response = await POST(request)

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('Validation error')
    expect(json.details).toBeDefined()
  })
})
