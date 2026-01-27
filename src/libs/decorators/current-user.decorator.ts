import { type JwtPayload } from '@clerk/types';
import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { type Request } from 'express';

import { UserByClerkIdPipe } from '@/modules/user/presentation/pipes/user-by-clerk-id.pipe';

/**
 * Parameter decorator to extract the current authenticated user from the request
 * Usage: @CurrentUser() user: ClerkJwtPayload
 */
export const CurrentProviderUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request: Request = ctx.switchToHttp().getRequest();
    return request.auth as JwtPayload;
  },
);

export const CurrentDbUser = () => CurrentProviderUser(UserByClerkIdPipe);
