import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import { Env } from '@/libs/configs';
import { PrismaClient } from '@/libs/databases/prisma/generated/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly configService: ConfigService) {
    const isProduction =
      configService.get<string>(Env.NODE_ENV) === 'production';

    const pool = new Pool({
      connectionString: configService.getOrThrow<string>(Env.DATABASE_URL),
      connectionTimeoutMillis: 20000,
      ssl: isProduction ? { rejectUnauthorized: false } : false,
    });
    const adapter = new PrismaPg(pool);
    super({
      adapter,
      transactionOptions: {
        maxWait: 10000, // Max time to acquire a transaction slot (ms)
        timeout: 15000, // Max transaction execution time (ms)
      },
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      await this.$queryRaw`SELECT 1`;
      this.logger.log(
        `🚀 [${this.configService.get<string>(Env.NODE_ENV)}] Connected to database`,
      );
    } catch (error) {
      this.logger.error('❌ Failed to connect to database', error);
      throw error;
    }
  }
}
