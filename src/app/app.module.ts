import { Module } from '@nestjs/common';

import { AppConfigModule } from '@/libs/configs/config.module';
import { DatabaseModule } from '@/libs/databases/database.module';

@Module({
  imports: [DatabaseModule, AppConfigModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
