/**
 * Cache Key Builder
 *
 * Centralized cache key management for consistent naming and easy maintenance.
 * All cache keys should be defined here.
 */
export const CachePrefix = {
  USER: 'user',
  RESUME: 'resume',
} as const;

export const CacheKeys = {
  user: {
    byProviderId: (providerId: string): string =>
      `${CachePrefix.USER}:provider:${providerId}`,
  },
  resume: {
    byId: (resumeId: string): string => `${CachePrefix.RESUME}:id:${resumeId}`,
    byUserId: (userId: string): string =>
      `${CachePrefix.RESUME}:user:${userId}`,
  },
} as const;

export type CacheKeyBuilder = typeof CacheKeys;
