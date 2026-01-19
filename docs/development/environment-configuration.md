# Environment Configuration

This guide explains how to configure environment variables for the RAG CV Builder backend.

## Environment Files

| File           | Purpose                       | Git Tracked |
| -------------- | ----------------------------- | ----------- |
| `.env.example` | Template with all variables   | ✅ Yes      |
| `.env`         | Local development environment | ❌ No       |

## Setup

1. Copy the example file:

```bash
cp .env.example .env
```

2. Edit `.env` with your values:

```bash
nano .env
# or
code .env
```

## Configuration Variables

### Application

| Variable      | Description        | Default       | Required |
| ------------- | ------------------ | ------------- | -------- |
| `NODE_ENV`    | Environment mode   | `development` | Yes      |
| `PORT`        | Server port        | `3000`        | Yes      |
| `API_VERSION` | API version prefix | `v1`          | Yes      |
| `API_PREFIX`  | API route prefix   | `api`         | Yes      |

```env
NODE_ENV=development
PORT=3000
API_VERSION=v1
API_PREFIX=api
```

### Database (PostgreSQL)

| Variable       | Description           | Example                                    |
| -------------- | --------------------- | ------------------------------------------ |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@localhost:5432/db` |

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rag_cv_builder
```

### Authentication (Clerk)

| Variable                | Description           | Required |
| ----------------------- | --------------------- | -------- |
| `CLERK_SECRET_KEY`      | Clerk secret key      | Yes      |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key | Yes      |

```env
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
```

### Caching (Redis)

| Variable     | Description | Default     |
| ------------ | ----------- | ----------- |
| `REDIS_HOST` | Redis host  | `localhost` |
| `REDIS_PORT` | Redis port  | `6379`      |

```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Accessing Configuration in Code

### Using ConfigService

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getPort(): number {
    return this.configService.get<number>('PORT', 3000);
  }

  getDatabaseUrl(): string {
    return this.configService.getOrThrow<string>('DATABASE_URL');
  }
}
```

### Environment Validation

The application validates environment variables on startup using Joi:

```typescript
// src/libs/configs/validation.schema.ts
import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  CLERK_SECRET_KEY: Joi.string().required(),
  // ... other validations
});
```

## Environment-Specific Behavior

```typescript
// Check environment
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Or using ConfigService
const nodeEnv = this.configService.get<string>('NODE_ENV');
```

## Security Best Practices

1. **Never commit `.env`** - It's in `.gitignore`
2. **Use secrets manager in production** - AWS Secrets Manager, HashiCorp Vault, etc.
3. **Rotate credentials regularly**
4. **Use different credentials per environment**
5. **Validate all required variables on startup**

## Docker Environment

When running with Docker, pass environment variables:

```bash
# Using --env-file
docker run --env-file .env rag-cv-builder

# Or using docker-compose.yml
docker compose up
```

Example `docker-compose.yml`:

```yaml
services:
  app:
    build: .
    env_file:
      - .env
    environment:
      - NODE_ENV=production
```
