import KeyvRedis from '@keyv/redis';
import {
  CACHE_MANAGER,
  CacheModule as NestCacheModule,
} from '@nestjs/cache-manager';
import { Global, Inject, Injectable, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Keyv } from 'keyv';

import { Env } from '@/libs/configs/env.config';

export const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

interface CacheStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
}

@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cache: CacheStore,
  ) {}

  async get<T>(key: string): Promise<T | undefined> {
    return this.cache.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cache.set(key, value, ttl ?? DEFAULT_CACHE_TTL);
  }

  async del(key: string): Promise<void> {
    await this.cache.del(key);
  }
}

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      useFactory: (configService: ConfigService): any => {
        const redisUrl = configService.getOrThrow<string>(Env.REDIS_URL);
        const namespace = configService.getOrThrow<string>(Env.REDIS_NAMESPACE);

        const keyvRedis = new KeyvRedis(redisUrl);
        const keyv = new Keyv({ store: keyvRedis, namespace });

        return {
          stores: [keyv],
          ttl: DEFAULT_CACHE_TTL,
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [CacheService],
  exports: [CacheService, NestCacheModule],
})
export class CacheModule {}
