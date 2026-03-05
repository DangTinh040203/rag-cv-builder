import { InternalServerErrorException, Logger } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { CLERK_STRATEGY } from '@/modules/user/application/interfaces';
import { ClerkWebhookService } from '@/modules/user/application/services/clerk-webhook.service';
import { ClerkUserWebhook } from '@/modules/user/domain';

describe('ClerkWebhookService', () => {
  let service: ClerkWebhookService;
  let loggerWarningSpy: jest.SpyInstance;

  const mockStrategy = {
    getType: jest.fn().mockReturnValue(ClerkUserWebhook.USER_CREATED),
    handle: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClerkWebhookService,
        Logger,
        {
          provide: CLERK_STRATEGY,
          useValue: [mockStrategy],
        },
      ],
    }).compile();

    service = module.get<ClerkWebhookService>(ClerkWebhookService);
    loggerWarningSpy = jest
      .spyOn(module.get<Logger>(Logger), 'warn')
      .mockImplementation();

    // Manually call onModuleInit to populate strategiesMap
    service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should process webhook if strategy exists', async () => {
    const mockEvent = { type: ClerkUserWebhook.USER_CREATED, data: {} } as any;

    await service.processWebhook(mockEvent);

    expect(mockStrategy.handle).toHaveBeenCalledWith(mockEvent);
  });

  it('should log warning if no strategy exists for event type', async () => {
    const mockEvent = { type: ClerkUserWebhook.USER_UPDATED, data: {} } as any;

    await service.processWebhook(mockEvent);

    expect(loggerWarningSpy).toHaveBeenCalledWith(
      `No strategy found for event type: ${ClerkUserWebhook.USER_UPDATED}`,
      ClerkWebhookService.name,
    );
    expect(mockStrategy.handle).not.toHaveBeenCalled();
  });

  it('should throw InternalServerErrorException if evt is null', async () => {
    await expect(service.processWebhook(null)).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
