import { SetMetadata } from '@nestjs/common';

import { IS_PUBLIC_KEY } from '@/libs/guards/clerk-auth.guard';

/**
 * Decorator to mark a route as public, bypassing authentication
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
