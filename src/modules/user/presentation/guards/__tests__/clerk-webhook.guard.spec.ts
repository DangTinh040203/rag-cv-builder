import {
  type ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { Webhook } from 'svix';

import { ClerkWebhookGuard } from '@/modules/user/presentation/guards/clerk-webhook.guard';

jest.mock('svix', () => {
  return {
    Webhook: jest.fn().mockImplementation(() => ({
      verify: jest.fn(),
    })),
  };
});

describe('ClerkWebhookGuard', () => {
  let guard: ClerkWebhookGuard;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClerkWebhookGuard,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('mock-webhook-secret'),
          },
        },
      ],
    }).compile();

    guard = module.get<ClerkWebhookGuard>(ClerkWebhookGuard);
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockContext = (
    headers: Record<string, string> = {},
    body: any = {},
  ): ExecutionContext =>
    ({
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          headers,
          body,
        }),
      }),
    }) as any;

  it('should throw ForbiddenException if any svix header is missing', () => {
    const context = createMockContext({
      'svix-id': 'id',
      // missing timestamp and signature
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(
      'Missing required svix headers',
    );
    expect(loggerErrorSpy).toHaveBeenCalledWith('Missing svix headers');
  });

  it('should throw ForbiddenException if webhook verification fails', () => {
    const headers = {
      'svix-id': 'id',
      'svix-timestamp': 'timestamp',
      'svix-signature': 'signature',
    };
    const context = createMockContext(headers, { data: 'test' });

    const mockVerify = jest.fn().mockImplementation(() => {
      throw new Error('Verification failed');
    });
    (Webhook as jest.Mock).mockImplementation(() => ({
      verify: mockVerify,
    }));

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(
      'Webhook verification failed',
    );
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Error verifying webhook:',
      expect.any(Error),
    );
  });

  it('should attach verified event to request and return true on success', () => {
    const headers = {
      'svix-id': 'id',
      'svix-timestamp': 'timestamp',
      'svix-signature': 'signature',
    };
    const body = { type: 'user.created', data: { id: 'user-1' } };
    const context = createMockContext(headers, body);

    const mockVerify = jest.fn().mockReturnValue(body);
    (Webhook as jest.Mock).mockImplementation(() => ({
      verify: mockVerify,
    }));

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockVerify).toHaveBeenCalledWith(JSON.stringify(body), headers);

    const request = context.switchToHttp().getRequest();
    expect(request.clerkEvent).toEqual(body);
  });
});
