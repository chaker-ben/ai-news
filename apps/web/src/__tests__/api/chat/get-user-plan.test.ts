import { vi, describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@ai-news/db'
import { getUserPlan } from '@/app/api/chat/_lib/get-user-plan'

describe('[Chat] getUserPlan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return "free" when no subscription exists', async () => {
    // Arrange
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null)

    // Act
    const result = await getUserPlan('user_123')

    // Assert
    expect(result).toBe('free')
    expect(prisma.subscription.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user_123' },
      select: { plan: true, status: true },
    })
  })

  it('should return "free" when subscription status is cancelled', async () => {
    // Arrange
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      plan: 'pro',
      status: 'cancelled',
    } as never)

    // Act
    const result = await getUserPlan('user_123')

    // Assert
    expect(result).toBe('free')
  })

  it('should return "free" when subscription status is past_due', async () => {
    // Arrange
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      plan: 'team',
      status: 'past_due',
    } as never)

    // Act
    const result = await getUserPlan('user_123')

    // Assert
    expect(result).toBe('free')
  })

  it('should return plan slug when subscription is active', async () => {
    // Arrange
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      plan: 'pro',
      status: 'active',
    } as never)

    // Act
    const result = await getUserPlan('user_123')

    // Assert
    expect(result).toBe('pro')
  })

  it('should return plan slug when subscription is trialing', async () => {
    // Arrange
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      plan: 'enterprise',
      status: 'trialing',
    } as never)

    // Act
    const result = await getUserPlan('user_123')

    // Assert
    expect(result).toBe('enterprise')
  })
})
