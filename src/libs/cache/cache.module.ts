import KeyvRedis from '@keyv/redis';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Keyv } from 'keyv';

import { CacheService } from '@/libs/cache/cache.server';
import { Env } from '@/libs/configs/env.config';

export const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      useFactory: (configService: ConfigService) => {
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
