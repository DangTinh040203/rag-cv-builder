import { ConfigModule } from '@nestjs/config';

import { validationSchema } from '@/libs/configs/env.config';

export const AppConfigModule = ConfigModule.forRoot({
  isGlobal: true,
  validationSchema: validationSchema,
});
