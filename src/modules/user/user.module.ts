import { Module } from '@nestjs/common';
import { UserController } from '@/modules/user/presentation/controllers/user.controller';
import { UserService } from '@/modules/user/application/services/user.service';

@Module({
  imports: [],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
