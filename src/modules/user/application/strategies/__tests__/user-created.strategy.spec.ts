import { ConflictException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, type TestingModule } from '@nestjs/testing';

import { USER_REPOSITORY_TOKEN } from '@/modules/user/application/interfaces';
import { UserCreatedStrategy } from '@/modules/user/application/strategies/user-created.strategy';
import { ClerkUserWebhook } from '@/modules/user/domain';

describe('UserCreatedStrategy', () => {
  let strategy: UserCreatedStrategy;
  let loggerWarnSpy: jest.SpyInstance;

  const mockUserRepository = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserCreatedStrategy,
        {
          provide: USER_REPOSITORY_TOKEN,
          useValue: mockUserRepository,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    strategy = module.get<UserCreatedStrategy>(UserCreatedStrategy);
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return USER_CREATED type', () => {
    expect(strategy.getType()).toBe(ClerkUserWebhook.USER_CREATED);
  });

  it('should create user and emit event', async () => {
    const mockEvent = {
      type: ClerkUserWebhook.USER_CREATED,
      data: {
        id: 'user-1',
        first_name: 'John',
        last_name: 'Doe',
        image_url: 'avatar.png',
        primary_email_address_id: 'email-1',
        email_addresses: [{ id: 'email-1', email_address: 'john@example.com' }],
      },
    } as any;

    mockUserRepository.findByEmail.mockResolvedValue(null);
    const createdUser = { id: 'uuid-1', email: 'john@example.com' };
    mockUserRepository.create.mockResolvedValue(createdUser);

    await strategy.handle(mockEvent);

    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
      'john@example.com',
    );
    expect(mockUserRepository.create).toHaveBeenCalledWith({
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      avatar: 'avatar.png',
      provider: 'clerk',
      providerId: 'user-1',
    });
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      'user.created',
      createdUser,
    );
  });

  it('should warn and exit if no primary email found', async () => {
    const mockEvent = {
      type: ClerkUserWebhook.USER_CREATED,
      data: {
        id: 'user-1',
        primary_email_address_id: 'non-existent',
        email_addresses: [],
      },
    } as any;

    await strategy.handle(mockEvent);

    expect(loggerWarnSpy).toHaveBeenCalledWith(
      'No primary email found for user user-1',
    );
    expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    expect(mockUserRepository.create).not.toHaveBeenCalled();
    expect(mockEventEmitter.emit).not.toHaveBeenCalled();
  });

  it('should throw ConflictException if user already exists', async () => {
    const mockEvent = {
      type: ClerkUserWebhook.USER_CREATED,
      data: {
        id: 'user-1',
        primary_email_address_id: 'email-1',
        email_addresses: [{ id: 'email-1', email_address: 'john@example.com' }],
      },
    } as any;

    mockUserRepository.findByEmail.mockResolvedValue({ id: 'existing-id' });

    await expect(strategy.handle(mockEvent)).rejects.toThrow(ConflictException);
    expect(mockUserRepository.create).not.toHaveBeenCalled();
    expect(mockEventEmitter.emit).not.toHaveBeenCalled();
  });
});
