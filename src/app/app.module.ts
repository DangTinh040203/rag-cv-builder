import { Module } from '@nestjs/common';

import { AppConfigModule } from '@/libs/configs/config.module';
import { DatabaseModule } from '@/libs/databases/database.module';
import { UserModule } from '@/modules/user/user.module';

@Module({
  imports: [UserModule, DatabaseModule, AppConfigModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
