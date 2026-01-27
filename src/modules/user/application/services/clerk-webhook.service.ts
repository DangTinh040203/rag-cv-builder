import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';

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
  }

  async processWebhook(evt: ClerkWebhook | null) {
    if (!evt) {
      throw new InternalServerErrorException(`Can't process webhook`);
    }

    const strategy = this.strategiesMap.get(evt.type);

    if (strategy) {
      await strategy.handle(evt);
    } else {
      this.logger.warn(
        `No strategy found for event type: ${evt.type}`,
        ClerkWebhookService.name,
      );
    }
  }
}
