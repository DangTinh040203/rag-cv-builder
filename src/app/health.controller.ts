import { Controller, Get } from '@nestjs/common';

import { Public } from '@/libs/decorators/public.decorator';

@Controller('health')
export class HealthController {
  @Get()
  @Public()
  check() {
    return {
      status: 'ok, checked',
      timestamp: new Date().toISOString(),
    };
  }
}
