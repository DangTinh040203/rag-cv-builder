import { Global, Module } from '@nestjs/common';

import { PrismaService } from '@/libs/databases/prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
