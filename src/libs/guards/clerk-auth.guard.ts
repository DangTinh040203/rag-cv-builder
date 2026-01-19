import { verifyToken } from '@clerk/backend';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { Env } from '@/libs/configs';

export const IS_PUBLIC_KEY = 'isPublic';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request: Request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('No authorization header provided');
    }

    const token: string = authHeader.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = await verifyToken(token, {
        secretKey: this.configService.getOrThrow(Env.CLERK_SECRET_KEY),
      });

      // Attach the auth payload to the request object
      request.auth = payload;

      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
