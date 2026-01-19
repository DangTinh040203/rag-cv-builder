# Error Handling

This guide covers error handling patterns and best practices for the RAG CV Builder backend.

## NestJS Built-in Exceptions

Use NestJS's built-in HTTP exceptions for common error scenarios:

| Exception                      | HTTP Status | Use Case                        |
| ------------------------------ | ----------- | ------------------------------- |
| `BadRequestException`          | 400         | Invalid input, validation error |
| `UnauthorizedException`        | 401         | Missing or invalid credentials  |
| `ForbiddenException`           | 403         | Access denied                   |
| `NotFoundException`            | 404         | Resource not found              |
| `ConflictException`            | 409         | Duplicate resource              |
| `UnprocessableEntityException` | 422         | Semantic validation errors      |
| `InternalServerErrorException` | 500         | Unexpected server errors        |

### Usage Examples

```typescript
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class UserService {
  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async createUser(dto: CreateUserDto): Promise<User> {
    if (!dto.email.includes('@')) {
      throw new BadRequestException('Invalid email format');
    }

    return this.userRepository.create(dto);
  }
}
```

## Custom Business Exceptions

Create domain-specific exceptions for better error semantics:

```typescript
// src/modules/user/domain/exceptions/user-already-exists.exception.ts
import { ConflictException } from '@nestjs/common';

export class UserAlreadyExistsException extends ConflictException {
  constructor(email: string) {
    super({
      code: 'USER_ALREADY_EXISTS',
      message: `User with email ${email} already exists`,
    });
  }
}

// Usage
throw new UserAlreadyExistsException('john@example.com');
```

### Exception with Custom Payload

```typescript
export class ValidationException extends BadRequestException {
  constructor(errors: Record<string, string[]>) {
    super({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors,
    });
  }
}

// Usage
throw new ValidationException({
  email: ['Email is required', 'Email must be valid'],
  password: ['Password must be at least 8 characters'],
});
```

## Global Exception Filter

The application uses a global exception filter for consistent error responses:

```typescript
// src/libs/filters/http-exception.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { type Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Log error details
    this.logger.error(
      `HTTP ${status} Error: ${JSON.stringify(message)}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      ...(typeof message === 'object' ? message : { message }),
    });
  }
}
```

### Registering the Filter

```typescript
// src/main.ts
import { HttpExceptionFilter } from '@/libs/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(3000);
}
```

## Error Response Format

All error responses follow a consistent structure:

```json
{
  "statusCode": 404,
  "timestamp": "2024-01-19T12:00:00.000Z",
  "message": "User with ID abc123 not found",
  "code": "USER_NOT_FOUND"
}
```

### Validation Error Response

```json
{
  "statusCode": 400,
  "timestamp": "2024-01-19T12:00:00.000Z",
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "errors": {
    "email": ["email must be a valid email"],
    "name": ["name should not be empty"]
  }
}
```

## Async Error Handling

### Always Await Promises

```typescript
// ✅ Good - Error will be caught
async createUser(dto: CreateUserDto): Promise<User> {
  try {
    const user = await this.userRepository.create(dto);
    await this.emailService.sendWelcome(user.email);
    return user;
  } catch (error) {
    this.logger.error('Failed to create user', error);
    throw error;
  }
}

// ❌ Bad - Floating promise, error won't be caught
async createUser(dto: CreateUserDto): Promise<User> {
  const user = await this.userRepository.create(dto);
  this.emailService.sendWelcome(user.email); // Missing await!
  return user;
}
```

### Wrapping External Services

```typescript
async callExternalApi(): Promise<ExternalData> {
  try {
    const response = await this.httpService.get('/api/data');
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new NotFoundException('External resource not found');
    }
    throw new InternalServerErrorException('External service unavailable');
  }
}
```

## Logging Errors

Use the built-in Logger for error tracking:

```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  async riskyOperation(): Promise<void> {
    try {
      await this.performOperation();
    } catch (error) {
      this.logger.error('Operation failed', error.stack);
      throw error;
    }
  }
}
```

## Best Practices

1. **Use specific exceptions** - Prefer `NotFoundException` over generic `Error`
2. **Include context** - Add relevant IDs and details in error messages
3. **Log before throwing** - Log detailed info, throw user-friendly message
4. **Don't expose internals** - Hide stack traces and sensitive data in production
5. **Validate early** - Catch validation errors at the controller level
6. **Handle async properly** - Always await promises, use try-catch
