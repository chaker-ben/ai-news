import { vi } from 'vitest'

// Mock @clerk/nextjs/server
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

// Mock @ai-news/db
vi.mock('@ai-news/db', () => ({
  prisma: {
    subscription: { findUnique: vi.fn() },
    chatMessage: { count: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    chatConversation: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    aiCreditUsage: { aggregate: vi.fn(), create: vi.fn() },
    article: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    articleMedia: { count: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}))

// Mock @anthropic-ai/sdk
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn(),
      },
    })),
  }
})

// Mock @/lib/env
vi.mock('@/lib/env', () => ({
  env: {
    ANTHROPIC_API_KEY: 'test-api-key',
    R2_ACCOUNT_ID: 'test-account',
    R2_ACCESS_KEY_ID: 'test-key',
    R2_SECRET_ACCESS_KEY: 'test-secret',
    R2_BUCKET_NAME: 'test-bucket',
    R2_PUBLIC_URL: 'https://cdn.example.com',
  },
}))

// Mock @/lib/upload
vi.mock('@/lib/upload', () => ({
  validateMediaType: vi.fn().mockReturnValue({ valid: true }),
  validateMediaSize: vi.fn().mockReturnValue({ valid: true }),
  createPresignedUploadUrl: vi.fn().mockResolvedValue({
    uploadUrl: 'https://r2.example.com/upload',
    key: 'articles/user1/art1/123-file.jpg',
    publicUrl: 'https://cdn.example.com/articles/user1/art1/123-file.jpg',
  }),
  deleteObject: vi.fn().mockResolvedValue(undefined),
}))
