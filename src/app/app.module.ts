import { AppConfigModule } from '@/libs/configs/config.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [AppConfigModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
