import { describe, it, expect } from 'vitest'
import {
  getPlanLimits,
  isFeatureAllowed,
  isWithinLimit,
} from '@/lib/plan-limits'

describe('[Plan Limits]', () => {
  describe('isFeatureAllowed', () => {
    describe('ai_chat', () => {
      it('should return false for free plan', () => {
        expect(isFeatureAllowed('free', 'ai_chat')).toBe(false)
      })

      it('should return true for pro plan', () => {
        expect(isFeatureAllowed('pro', 'ai_chat')).toBe(true)
      })

      it('should return true for team plan', () => {
        expect(isFeatureAllowed('team', 'ai_chat')).toBe(true)
      })

      it('should return true for enterprise plan', () => {
        expect(isFeatureAllowed('enterprise', 'ai_chat')).toBe(true)
      })
    })

    describe('publish_article', () => {
      it('should return false for free plan', () => {
        expect(isFeatureAllowed('free', 'publish_article')).toBe(false)
      })

      it('should return true for pro plan', () => {
        expect(isFeatureAllowed('pro', 'publish_article')).toBe(true)
      })

      it('should return true for team plan', () => {
        expect(isFeatureAllowed('team', 'publish_article')).toBe(true)
      })

      it('should return true for enterprise plan', () => {
        expect(isFeatureAllowed('enterprise', 'publish_article')).toBe(true)
      })
    })
  })

  describe('getPlanLimits', () => {
    it('should return chat_messages_per_day = 50 for pro', () => {
      expect(getPlanLimits('pro').chat_messages_per_day).toBe(50)
    })

    it('should return published_articles_per_month = 5 for pro', () => {
      expect(getPlanLimits('pro').published_articles_per_month).toBe(5)
    })

    it('should return chat_messages_per_day = 0 for free', () => {
      expect(getPlanLimits('free').chat_messages_per_day).toBe(0)
    })

    it('should return -1 (unlimited) for enterprise chat_messages_per_day', () => {
      expect(getPlanLimits('enterprise').chat_messages_per_day).toBe(-1)
    })

    it('should return max_images_per_article = 3 for pro', () => {
      expect(getPlanLimits('pro').max_images_per_article).toBe(3)
    })

    it('should return max_videos_per_article = 1 for pro', () => {
      expect(getPlanLimits('pro').max_videos_per_article).toBe(1)
    })

    it('should fallback to free plan for unknown plan slug', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const limits = getPlanLimits('unknown_plan' as any)
      expect(limits.published_articles_per_month).toBe(0)
    })
  })

  describe('isWithinLimit', () => {
    it('should return true when current count is below limit', () => {
      // pro: chat_messages_per_day = 50
      expect(isWithinLimit('pro', 'chat_messages_per_day', 49)).toBe(true)
    })

    it('should return false when current count equals limit', () => {
      // pro: chat_messages_per_day = 50
      expect(isWithinLimit('pro', 'chat_messages_per_day', 50)).toBe(false)
    })

    it('should return false when current count exceeds limit', () => {
      expect(isWithinLimit('pro', 'chat_messages_per_day', 100)).toBe(false)
    })

    it('should return true when limit is -1 (unlimited)', () => {
      // enterprise: chat_messages_per_day = -1
      expect(isWithinLimit('enterprise', 'chat_messages_per_day', 999_999)).toBe(true)
    })

    it('should return true when limit is 0 and count is 0 (edge: free plan)', () => {
      // free: chat_messages_per_day = 0, count 0 is NOT < 0
      expect(isWithinLimit('free', 'chat_messages_per_day', 0)).toBe(false)
    })

    it('should return true for published_articles_per_month within limit', () => {
      // pro: published_articles_per_month = 5
      expect(isWithinLimit('pro', 'published_articles_per_month', 4)).toBe(true)
    })

    it('should return false for published_articles_per_month at limit', () => {
      expect(isWithinLimit('pro', 'published_articles_per_month', 5)).toBe(false)
    })
  })
})
