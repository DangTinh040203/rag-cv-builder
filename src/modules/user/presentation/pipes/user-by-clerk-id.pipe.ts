import { type JwtPayload } from '@clerk/types';
import {
  Injectable,
  type PipeTransform,
  UnauthorizedException,
} from '@nestjs/common';

import { UserService } from '@/modules/user/application/services/user.service';
import { type User } from '@/modules/user/domain';

@Injectable()
export class UserByClerkIdPipe implements PipeTransform {
  constructor(private readonly userService: UserService) {}

  async transform(value: JwtPayload): Promise<User> {
    const providerId = value.sub;

    if (!providerId) {
      throw new UnauthorizedException('Missing provider ID in auth payload');
    }

    const user = await this.userService.findByProviderId(providerId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
