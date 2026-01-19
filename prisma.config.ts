import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

config({ path: './.env' });

export default defineConfig({
  schema: 'src/libs/databases/prisma/schema/schema.prisma',
  migrations: {
    path: 'src/libs/databases/prisma/schema/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
