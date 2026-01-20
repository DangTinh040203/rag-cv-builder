import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import {
  CLERK_STRATEGY,
  IClerkWebhookStrategy,
} from '@/modules/user/application/interfaces';
import { ClerkUserWebhook, ClerkWebhook } from '@/modules/user/domain';

@Injectable()
export class ClerkWebhookService implements OnModuleInit {
  private strategiesMap: Map<ClerkUserWebhook, IClerkWebhookStrategy> =
    new Map();

  constructor(
    @Inject(CLERK_STRATEGY)
    private readonly strategies: IClerkWebhookStrategy[],
    private readonly logger: Logger,
  ) {}

  onModuleInit() {
    this.strategies.forEach((strategy) => {
      this.strategiesMap.set(strategy.getType(), strategy);
    });
    this.logger.log(`Registered ${this.strategies.length} webhook strategies.`);
  }

  async processWebhook(evt: ClerkWebhook) {
    const strategy = this.strategiesMap.get(evt.type);

    if (!strategy) {
      throw new Error(`No strategy found for event: ${evt.type}`);
    }

    await strategy.handle(evt);
  }
}
