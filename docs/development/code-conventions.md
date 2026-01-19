# Code Conventions

This document outlines the coding standards and conventions for the RAG CV Builder backend.

## General Principles

1. **Consistency** - Follow existing patterns in the codebase
2. **Readability** - Write code that is easy to understand
3. **Maintainability** - Write code that is easy to modify
4. **Type Safety** - Leverage TypeScript's type system fully

## TypeScript Guidelines

### Naming Conventions

| Type        | Convention      | Example           |
| ----------- | --------------- | ----------------- |
| Classes     | PascalCase      | `UserService`     |
| Interfaces  | PascalCase      | `IUserRepository` |
| Types       | PascalCase      | `CreateUserDto`   |
| Functions   | camelCase       | `createUser`      |
| Variables   | camelCase       | `userId`          |
| Constants   | SCREAMING_SNAKE | `MAX_RETRY_COUNT` |
| Enums       | PascalCase      | `UserRole`        |
| Enum values | SCREAMING_SNAKE | `UserRole.ADMIN`  |
| Files       | kebab-case      | `user.service.ts` |

### Type Annotations

```typescript
// ✅ Good - Explicit return types for public methods
async getUser(id: string): Promise<User> {
  return this.userRepository.findById(id);
}

// ❌ Bad - Avoid using 'any'
function processData(data: any): any {
  // ...
}

// ✅ Good - Use proper types
function processData(data: UserData): ProcessedData {
  // ...
}
```

### Consistent Type Imports

Use inline type imports for better tree-shaking:

```typescript
// ✅ Good - Inline type imports
import { type UserEntity } from '@/modules/user/domain/entities/user.entity';
import { Injectable, type OnModuleInit } from '@nestjs/common';

// ❌ Bad - Separate type imports
import type { UserEntity } from '@/modules/user/domain/entities/user.entity';
```

### Avoid `any` Type

- Never use `any` unless absolutely necessary
- Use `unknown` if the type is truly unknown, then narrow it
- Create proper interfaces/types for all data structures

## NestJS Conventions

### Layer Rules

| Layer              | What Goes Here               | Can Import From       |
| ------------------ | ---------------------------- | --------------------- |
| **Domain**         | Entities, Interfaces (Ports) | Nothing (pure TS)     |
| **Application**    | Use Cases, Services          | Domain only           |
| **Infrastructure** | Repository implementations   | Domain, external libs |
| **Presentation**   | Controllers, DTOs            | Application, Domain   |

### Module Structure

```typescript
// src/modules/user/user.module.ts
import { Module } from '@nestjs/common';

import { UserService } from '@/modules/user/application/use-cases/user.service';
import { USER_REPOSITORY_TOKEN } from '@/modules/user/domain/ports/user.repository';
import { PrismaUserRepository } from '@/modules/user/infrastructure/adapters/prisma-user.repository';
import { UserController } from '@/modules/user/presentation/controllers/user.controller';

@Module({
  controllers: [UserController],
  providers: [
    UserService,
    {
      provide: USER_REPOSITORY_TOKEN, // Interface token
      useClass: PrismaUserRepository, // Implementation
    },
  ],
  exports: [UserService],
})
export class UserModule {}
```

### Dependency Injection with Interfaces

```typescript
// ✅ Good - Inject via interface token
@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
  ) {}
}

// ❌ Bad - Direct implementation injection
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: PrismaUserRepository, // Breaks abstraction!
  ) {}
}
```

### DTOs (Data Transfer Objects)

```typescript
// ✅ Good - Use class-validator decorators
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  bio?: string;
}
```

## Import Order

Imports are automatically sorted using `eslint-plugin-simple-import-sort`. The order follows:

1. External packages (npm modules)
2. App-specific imports (`@/*`)
3. Side-effect imports

> **Important:** Relative imports (`./*`, `../*`) are NOT allowed. All imports must use `@/` path alias.

```typescript
// External packages first
import { Injectable, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// App-specific imports with @/ alias
import { AuthGuard } from '@/libs/guards/auth.guard';
import { UserService } from '@/modules/user/application/use-cases/user.service';
import { type IUserRepository } from '@/modules/user/domain/ports/user.repository';
```

## Error Handling

### Use NestJS Built-in Exceptions

```typescript
// ✅ Good
throw new NotFoundException('User not found');
throw new BadRequestException('Invalid input');
throw new UnauthorizedException('Access denied');

// ❌ Bad
throw new Error('User not found');
```

### Custom Business Exceptions

```typescript
// Create domain-specific exceptions when needed
export class UserAlreadyExistsException extends ConflictException {
  constructor(email: string) {
    super(`User with email ${email} already exists`);
  }
}
```

## Async/Await Best Practices

```typescript
// ✅ Good - Always await async operations
async createUser(dto: CreateUserDto): Promise<User> {
  const user = await this.userRepository.create(dto);
  await this.notificationService.sendWelcomeEmail(user);
  return user;
}

// ❌ Bad - Floating promises (ESLint will warn)
async createUser(dto: CreateUserDto): Promise<User> {
  const user = await this.userRepository.create(dto);
  this.notificationService.sendWelcomeEmail(user); // Missing await!
  return user;
}
```

## Comments and Documentation

### JSDoc for Public APIs

```typescript
/**
 * Creates a new user in the system.
 * @param dto - The user creation data
 * @returns The newly created user
 * @throws UserAlreadyExistsException if email is already registered
 */
async createUser(dto: CreateUserDto): Promise<User> {
  // Implementation
}
```

### Inline Comments

```typescript
// ✅ Good - Explain WHY, not WHAT
// Use soft delete to preserve referential integrity with interviews
await this.userRepository.softDelete(userId);

// ❌ Bad - States the obvious
// Delete the user
await this.userRepository.delete(userId);
```

## Linting and Formatting

### ESLint

The project uses ESLint with TypeScript support. Key rules enforced:

| Rule                                         | Level | Description                     |
| -------------------------------------------- | ----- | ------------------------------- |
| `@typescript-eslint/require-await`           | error | Async functions must use await  |
| `@typescript-eslint/no-floating-promises`    | warn  | Must handle promises            |
| `@typescript-eslint/consistent-type-imports` | warn  | Use inline type imports         |
| `no-restricted-imports`                      | error | No relative imports allowed     |
| `simple-import-sort/imports`                 | warn  | Auto-sort imports               |
| `no-console`                                 | warn  | Avoid console.log in production |

Run linting:

```bash
# Check for issues
pnpm run lint

# Auto-fix issues
pnpm run lint:fix
```

### Prettier

Code formatting is handled by Prettier. Configuration (`.prettierrc`):

```json
{
  "arrowParens": "always",
  "bracketSpacing": true,
  "printWidth": 80,
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "useTabs": false
}
```

Run formatting:

```bash
pnpm run format
```

## Testing Conventions

### Test File Naming

```
user.service.ts          → user.service.spec.ts
user.controller.ts       → user.controller.spec.ts
```

### Test Structure

```typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      // Arrange
      const dto = { name: 'John', email: 'john@example.com' };

      // Act
      const result = await service.createUser(dto);

      // Assert
      expect(result.name).toBe('John');
    });

    it('should throw if email already exists', async () => {
      // ...
    });
  });
});
```

Run tests:

```bash
# Run all tests
pnpm run test

# Run with coverage
pnpm run test:cov

# Run in watch mode
pnpm run test:watch
```
