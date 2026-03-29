import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@ai-news/db'
import { deleteObject } from '@/lib/upload'
import { PATCH, DELETE } from '@/app/api/articles/publish/[articleId]/route'

function createMockRequest(options: {
  method?: string
  url?: string
  body?: unknown
  searchParams?: Record<string, string>
} = {}): NextRequest {
  const url = new URL(options.url ?? 'http://localhost:3000/api/articles/publish/art_1')
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

describe('[Articles Publish Article] /api/articles/publish/[articleId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('PATCH', () => {
    const validBody = { title: 'Updated title', language: 'fr' as const }

    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as never)

      const request = createMockRequest({ method: 'PATCH', body: validBody })
      const response = await PATCH(request, { params: makeParams('art_1') })

      expect(response.status).toBe(401)
      const json = await response.json()
      expect(json.error).toBe('Unauthorized')
    })

    it('should return 404 when article not found', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
      vi.mocked(prisma.article.findUnique).mockResolvedValue(null)

      const request = createMockRequest({ method: 'PATCH', body: validBody })
      const response = await PATCH(request, { params: makeParams('art_999') })

      expect(response.status).toBe(404)
      const json = await response.json()
      expect(json.error).toBe('Article not found')
    })

    it('should return 403 when user does not own article', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
      vi.mocked(prisma.article.findUnique).mockResolvedValue({
        id: 'art_1',
        authorId: 'user_other',
        status: 'draft',
      } as never)

      const request = createMockRequest({ method: 'PATCH', body: validBody })
      const response = await PATCH(request, { params: makeParams('art_1') })

      expect(response.status).toBe(403)
      const json = await response.json()
      expect(json.error).toBe('Forbidden')
    })

    it('should return 400 when article is not draft', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
      vi.mocked(prisma.article.findUnique).mockResolvedValue({
        id: 'art_1',
        authorId: 'user_123',
        status: 'published',
      } as never)

      const request = createMockRequest({ method: 'PATCH', body: validBody })
      const response = await PATCH(request, { params: makeParams('art_1') })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('Only draft articles can be edited')
    })

    it('should return updated article on success', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
      vi.mocked(prisma.article.findUnique).mockResolvedValue({
        id: 'art_1',
        authorId: 'user_123',
        status: 'draft',
      } as never)

      const updatedArticle = {
        id: 'art_1',
        authorId: 'user_123',
        status: 'draft',
        originalTitle: 'Updated title',
        titleFr: 'Updated title',
        media: [],
      }
      vi.mocked(prisma.article.update).mockResolvedValue(updatedArticle as never)

      const request = createMockRequest({ method: 'PATCH', body: validBody })
      const response = await PATCH(request, { params: makeParams('art_1') })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.data).toEqual(updatedArticle)
    })
  })

  describe('DELETE', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as never)

      const request = createMockRequest({ method: 'DELETE' })
      const response = await DELETE(request, { params: makeParams('art_1') })

      expect(response.status).toBe(401)
      const json = await response.json()
      expect(json.error).toBe('Unauthorized')
    })

    it('should return 404 when article not found', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
      vi.mocked(prisma.article.findUnique).mockResolvedValue(null)

      const request = createMockRequest({ method: 'DELETE' })
      const response = await DELETE(request, { params: makeParams('art_999') })

      expect(response.status).toBe(404)
      const json = await response.json()
      expect(json.error).toBe('Article not found')
    })

    it('should return 403 when user does not own article', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
      vi.mocked(prisma.article.findUnique).mockResolvedValue({
        id: 'art_1',
        authorId: 'user_other',
        status: 'draft',
        media: [],
      } as never)

      const request = createMockRequest({ method: 'DELETE' })
      const response = await DELETE(request, { params: makeParams('art_1') })

      expect(response.status).toBe(403)
      const json = await response.json()
      expect(json.error).toBe('Forbidden')
    })

    it('should return 400 when article is published (not draft/rejected)', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
      vi.mocked(prisma.article.findUnique).mockResolvedValue({
        id: 'art_1',
        authorId: 'user_123',
        status: 'published',
        media: [],
      } as never)

      const request = createMockRequest({ method: 'DELETE' })
      const response = await DELETE(request, { params: makeParams('art_1') })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('Only draft or rejected articles can be deleted')
    })

    it('should delete media from R2 then delete article', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
      vi.mocked(prisma.article.findUnique).mockResolvedValue({
        id: 'art_1',
        authorId: 'user_123',
        status: 'draft',
        media: [{ key: 'key_1' }, { key: 'key_2' }],
      } as never)
      vi.mocked(deleteObject).mockResolvedValue(undefined)
      vi.mocked(prisma.article.delete).mockResolvedValue({ id: 'art_1' } as never)

      const request = createMockRequest({ method: 'DELETE' })
      await DELETE(request, { params: makeParams('art_1') })

      expect(deleteObject).toHaveBeenCalledTimes(2)
      expect(deleteObject).toHaveBeenCalledWith('key_1')
      expect(deleteObject).toHaveBeenCalledWith('key_2')
      expect(prisma.article.delete).toHaveBeenCalledWith({
        where: { id: 'art_1' },
      })
    })

    it('should return { deleted: true } on success', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
      vi.mocked(prisma.article.findUnique).mockResolvedValue({
        id: 'art_1',
        authorId: 'user_123',
        status: 'draft',
        media: [],
      } as never)
      vi.mocked(prisma.article.delete).mockResolvedValue({ id: 'art_1' } as never)

      const request = createMockRequest({ method: 'DELETE' })
      const response = await DELETE(request, { params: makeParams('art_1') })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.data).toEqual({ deleted: true })
    })
  })
})
