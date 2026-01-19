# Folder Structure

The project follows a clean architecture pattern with clear separation of concerns.

## Root Directory

```
rag-cv-builder/
├── docker/                 # Docker configuration files
│   ├── Dockerfile
│   └── docker-compose.yml
├── docs/                   # Documentation (Docsify)
├── src/                    # Source code
│   ├── app/                # Application bootstrap
│   ├── libs/               # Shared libraries
│   └── modules/            # Feature modules
├── .env                    # Environment variables
├── .env.example            # Environment template
├── eslint.config.mjs       # ESLint configuration
├── nest-cli.json           # NestJS CLI config
├── package.json            # Dependencies
├── prisma.config.ts        # Prisma configuration
├── tsconfig.json           # TypeScript configuration
└── README.md
```

## Source Code Structure (`src/`)

### Shared Libraries (`src/libs/`)

Reusable utilities and shared code:

```
src/libs/
├── configs/                # Configuration modules
│   ├── env.config.ts       # Environment configuration
│   └── validation.schema.ts # Joi validation schema
├── constants/              # Application constants
├── databases/              # Database module & adapters
│   ├── database.module.ts
│   └── prisma/             # Prisma service & adapter
├── decorators/             # Custom decorators
│   ├── current-user.decorator.ts
│   └── public.decorator.ts
├── filters/                # Exception filters
│   └── http-exception.filter.ts
├── guards/                 # Authentication guards
│   ├── auth.guard.ts
│   └── roles.guard.ts
├── interceptors/           # Request/Response interceptors
│   └── logging.interceptor.ts
├── middlewares/            # HTTP middlewares
│   └── logger.middleware.ts
├── pipes/                  # Validation pipes
│   └── validation.pipe.ts
├── types/                  # Shared TypeScript types
└── utils/                  # Utility functions
```

## Layer Responsibilities

| Layer              | Purpose                        | Dependencies           |
| ------------------ | ------------------------------ | ---------------------- |
| **Domain**         | Entities, interfaces, ports    | None (pure TypeScript) |
| **Application**    | Business logic, use cases      | Domain layer only      |
| **Infrastructure** | DB adapters, external services | Domain + external libs |
| **Presentation**   | Controllers, DTOs, validation  | Application + Domain   |

## Key Files

| File                    | Purpose                     |
| ----------------------- | --------------------------- |
| `src/main.ts`           | Application entry point     |
| `src/app/app.module.ts` | Root module configuration   |
| `prisma/schema.prisma`  | Database schema             |
| `tsconfig.json`         | TypeScript compiler options |
| `eslint.config.mjs`     | Linting rules               |

## Path Aliases

The project uses path aliases for clean imports:

```json
{
  "paths": {
    "@/*": ["src/*"]
  }
}
```

**Usage:**

```typescript
// ✅ Good - Using path alias
import { UserService } from '@/modules/user/application/use-cases/user.service';
import { AuthGuard } from '@/libs/guards/auth.guard';

// ❌ Bad - Relative imports (not allowed)
import { UserService } from '../../../modules/user/application/use-cases/user.service';
```
