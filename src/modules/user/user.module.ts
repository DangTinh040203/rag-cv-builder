import { Module } from '@nestjs/common';

import { UserService } from '@/modules/user/application/services/user.service';
import { UserController } from '@/modules/user/presentation/controllers/user.controller';

@Module({
  imports: [],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
