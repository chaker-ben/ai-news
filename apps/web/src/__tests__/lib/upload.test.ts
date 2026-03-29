vi.unmock('@/lib/upload')

import { vi, describe, it, expect } from 'vitest'
import { validateMediaType, validateMediaSize } from '@/lib/upload'

describe('[Upload Utilities]', () => {
  describe('validateMediaType', () => {
    it('should return valid for image/jpeg as image', () => {
      const result = validateMediaType('image/jpeg', 'image')
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should return valid for image/png as image', () => {
      const result = validateMediaType('image/png', 'image')
      expect(result.valid).toBe(true)
    })

    it('should return valid for image/webp as image', () => {
      const result = validateMediaType('image/webp', 'image')
      expect(result.valid).toBe(true)
    })

    it('should return invalid for text/plain as image', () => {
      const result = validateMediaType('text/plain', 'image')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error).toContain('Invalid file type')
    })

    it('should return valid for video/mp4 as video', () => {
      const result = validateMediaType('video/mp4', 'video')
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should return valid for video/webm as video', () => {
      const result = validateMediaType('video/webm', 'video')
      expect(result.valid).toBe(true)
    })

    it('should return invalid for image/jpeg as video', () => {
      const result = validateMediaType('image/jpeg', 'video')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error).toContain('Invalid file type')
    })

    it('should return invalid for application/pdf as image', () => {
      const result = validateMediaType('application/pdf', 'image')
      expect(result.valid).toBe(false)
    })
  })

  describe('validateMediaSize', () => {
    it('should return valid for 5MB image (within 10MB limit)', () => {
      const result = validateMediaSize(5 * 1024 * 1024, 'image')
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should return valid for exactly 10MB image (boundary)', () => {
      const result = validateMediaSize(10 * 1024 * 1024, 'image')
      expect(result.valid).toBe(true)
    })

    it('should return invalid for 15MB image (exceeds 10MB limit)', () => {
      const result = validateMediaSize(15 * 1024 * 1024, 'image')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error).toContain('too large')
    })

    it('should return valid for 50MB video (within 100MB limit)', () => {
      const result = validateMediaSize(50 * 1024 * 1024, 'video')
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should return valid for exactly 100MB video (boundary)', () => {
      const result = validateMediaSize(100 * 1024 * 1024, 'video')
      expect(result.valid).toBe(true)
    })

    it('should return invalid for 150MB video (exceeds 100MB limit)', () => {
      const result = validateMediaSize(150 * 1024 * 1024, 'video')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error).toContain('too large')
    })

    it('should return valid for 0 bytes', () => {
      const result = validateMediaSize(0, 'image')
      expect(result.valid).toBe(true)
    })

    it('should return valid for 1 byte', () => {
      const result = validateMediaSize(1, 'image')
      expect(result.valid).toBe(true)
    })
  })
})
