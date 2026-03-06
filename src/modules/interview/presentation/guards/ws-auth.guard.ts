import { verifyToken } from '@clerk/backend';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Socket } from 'socket.io';

import { Env } from '@/libs/configs';

@Injectable()
export class WsAuthGuard {
  private readonly logger = new Logger(WsAuthGuard.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Authenticate a WebSocket client by verifying Clerk JWT from handshake.
   * @returns The Clerk user ID (sub) if valid, null otherwise.
   */
  async authenticate(client: Socket): Promise<string | null> {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(
          `WebSocket auth failed — no token (socket: ${client.id})`,
        );
        return null;
      }

      const payload = await verifyToken(token, {
        secretKey: this.configService.getOrThrow(Env.CLERK_SECRET_KEY),
      });

      return payload.sub ?? null;
    } catch (error) {
      this.logger.warn(
        `WebSocket auth failed — invalid token (socket: ${client.id}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }
}
