import { Inject, Injectable } from '@nestjs/common';

import {
  type IUserRepository,
  USER_REPOSITORY_TOKEN,
} from '@/modules/user/application/interfaces';
import { type User } from '@/modules/user/domain';

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
  ) {}

  async findByProviderId(providerId: string): Promise<User | null> {
    return this.userRepository.findByProviderId(providerId);
  }
}
