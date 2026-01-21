import { type JwtPayload } from '@clerk/types';
import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { type Request } from 'express';

/**
 * Parameter decorator to extract the current authenticated user from the request
 * Usage: @CurrentUser() user: ClerkJwtPayload
 */
export const CurrentUser: ParameterDecorator = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request: Request = ctx.switchToHttp().getRequest();
    return request.auth as JwtPayload;
  },
);
