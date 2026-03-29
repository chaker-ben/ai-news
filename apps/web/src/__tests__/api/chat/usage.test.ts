import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@ai-news/db'
import { GET } from '@/app/api/chat/usage/route'

describe('[Chat] GET /api/chat/usage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not authenticated', async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({ userId: null } as never)

    // Act
    const response = await GET()

    // Assert
    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('should return usage data for pro user with some messages today', async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      plan: 'pro',
      status: 'active',
    } as never)
    vi.mocked(prisma.chatMessage.count).mockResolvedValue(10)
    vi.mocked(prisma.aiCreditUsage.aggregate).mockResolvedValue({
      _sum: { tokensUsed: 25000 },
    } as never)

    // Act
    const response = await GET()

    // Assert
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data).toEqual({
      messages_today: 10,
      messages_limit: 50,
      tokens_this_month: 25000,
      tokens_limit: 100_000,
      can_chat: true,
    })
  })

  it('should return can_chat=false when free plan (0 message limit)', async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.chatMessage.count).mockResolvedValue(0)
    vi.mocked(prisma.aiCreditUsage.aggregate).mockResolvedValue({
      _sum: { tokensUsed: null },
    } as never)

    // Act
    const response = await GET()

    // Assert
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data.can_chat).toBe(false)
    expect(json.data.messages_limit).toBe(0)
  })

  it('should return can_chat=false when daily limit reached', async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      plan: 'pro',
      status: 'active',
    } as never)
    vi.mocked(prisma.chatMessage.count).mockResolvedValue(50) // pro limit = 50
    vi.mocked(prisma.aiCreditUsage.aggregate).mockResolvedValue({
      _sum: { tokensUsed: 1000 },
    } as never)

    // Act
    const response = await GET()

    // Assert
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data.can_chat).toBe(false)
    expect(json.data.messages_today).toBe(50)
  })

  it('should return can_chat=false when monthly token limit reached', async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      plan: 'pro',
      status: 'active',
    } as never)
    vi.mocked(prisma.chatMessage.count).mockResolvedValue(5)
    vi.mocked(prisma.aiCreditUsage.aggregate).mockResolvedValue({
      _sum: { tokensUsed: 100_000 }, // pro limit = 100_000
    } as never)

    // Act
    const response = await GET()

    // Assert
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data.can_chat).toBe(false)
    expect(json.data.tokens_this_month).toBe(100_000)
  })

  it('should return can_chat=true for enterprise (unlimited = -1)', async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      plan: 'enterprise',
      status: 'active',
    } as never)
    vi.mocked(prisma.chatMessage.count).mockResolvedValue(999)
    vi.mocked(prisma.aiCreditUsage.aggregate).mockResolvedValue({
      _sum: { tokensUsed: 999_999 },
    } as never)

    // Act
    const response = await GET()

    // Assert
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data.can_chat).toBe(true)
    expect(json.data.messages_limit).toBe(-1)
    expect(json.data.tokens_limit).toBe(-1)
  })

  it('should handle null tokensUsed sum gracefully', async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as never)
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      plan: 'pro',
      status: 'active',
    } as never)
    vi.mocked(prisma.chatMessage.count).mockResolvedValue(0)
    vi.mocked(prisma.aiCreditUsage.aggregate).mockResolvedValue({
      _sum: { tokensUsed: null },
    } as never)

    // Act
    const response = await GET()

    // Assert
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data.tokens_this_month).toBe(0)
    expect(json.data.can_chat).toBe(true)
  })
})
