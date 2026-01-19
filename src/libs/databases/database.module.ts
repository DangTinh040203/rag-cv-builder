import { Module } from '@nestjs/common';

import { PrismaService } from '@/libs/databases/prisma.service';

@Module({
  controllers: [],
  providers: [PrismaService],
})
export class DatabaseModule {}
