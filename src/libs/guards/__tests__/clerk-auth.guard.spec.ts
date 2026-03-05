import { verifyToken } from '@clerk/backend';
import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';

import { ClerkAuthGuard } from '@/libs/guards/clerk-auth.guard';

jest.mock('@clerk/backend', () => ({
  verifyToken: jest.fn(),
}));

describe('ClerkAuthGuard', () => {
  let guard: ClerkAuthGuard;
  let configService: ConfigService;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClerkAuthGuard,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('mock-secret-key'),
          },
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<ClerkAuthGuard>(ClerkAuthGuard);
    configService = module.get<ConfigService>(ConfigService);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockContext = (
    headers: Record<string, string> = {},
  ): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          headers,
        }),
      }),
    }) as any;

  it('should allow access if route is public', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const context = createMockContext();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(verifyToken).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException if authorization header is missing', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const context = createMockContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Missing or invalid authorization header',
    );
  });

  it('should throw UnauthorizedException if authorization header does not start with Bearer', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const context = createMockContext({ authorization: 'Basic token123' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Missing or invalid authorization header',
    );
  });

  it('should throw UnauthorizedException if token is empty', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const context = createMockContext({ authorization: 'Bearer ' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      'No token provided',
    ); // Note: slice(7) on 'Bearer ' returns ''
  });

  it('should throw UnauthorizedException if token is invalid', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const context = createMockContext({
      authorization: 'Bearer invalid-token',
    });
    (verifyToken as jest.Mock).mockRejectedValue(new Error('Invalid token'));

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow('Invalid token');
  });

  it('should attach payload to request and return true if token is valid', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const context = createMockContext({ authorization: 'Bearer valid-token' });
    const mockPayload = { sub: 'user-1' };
    (verifyToken as jest.Mock).mockResolvedValue(mockPayload);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(verifyToken).toHaveBeenCalledWith('valid-token', {
      secretKey: 'mock-secret-key',
    });

    const request = context.switchToHttp().getRequest();
    expect(request.auth).toEqual(mockPayload);
  });
});
