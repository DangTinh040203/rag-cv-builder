import { Module } from '@nestjs/common';

import { AppConfigModule } from '@/libs/configs/config.module';

@Module({
  imports: [AppConfigModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
