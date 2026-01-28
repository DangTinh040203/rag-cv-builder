import { Inject, Injectable, Logger } from '@nestjs/common';

import { CacheKeys, CacheService } from '@/libs/cache';
import {
  type IUserRepository,
  USER_REPOSITORY_TOKEN,
} from '@/modules/user/application/interfaces';
import { type User } from '@/modules/user/domain';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
    private readonly cacheService: CacheService,
  ) {}

  async findByProviderId(providerId: string): Promise<User | null> {
    const cacheKey = CacheKeys.user.byProviderId(providerId);

    const cachedUser = await this.cacheService.get<User | null>(cacheKey);

    if (cachedUser !== undefined) {
      if (cachedUser === null) {
        this.logger.debug(`Cache HIT (null) for user: ${providerId}`);
        return null;
      }
      this.logger.debug(`Cache HIT for user: ${providerId}`);
      return cachedUser;
    }

    this.logger.debug(`Cache MISS for user: ${providerId}`);

    const user = await this.userRepository.findByProviderId(providerId);

    if (user) {
      await this.cacheService.set(cacheKey, user);
    } else {
      // Cache null to prevent cache penetration (1 min)
      await this.cacheService.set(cacheKey, null, 60 * 1000);
    }

    return user;
  }

  async invalidateUserCache(providerId: string): Promise<void> {
    const cacheKey = CacheKeys.user.byProviderId(providerId);
    await this.cacheService.del(cacheKey);
    this.logger.debug(`Cache invalidated for user: ${providerId}`);
  }
}
