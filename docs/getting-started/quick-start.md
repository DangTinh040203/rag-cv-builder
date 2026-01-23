# Quick Start

This guide will help you set up and run the RAG CV Builder backend locally.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 20.x
- **pnpm** >= 9.x
- **Docker** (for PostgreSQL and Redis)
- **Git**

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd rag-cv-builder
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

### 4. Start Docker Services

Start PostgreSQL and Redis using Docker:

```bash
pnpm run dev:setup
```

This command will:

1. Generate Prisma client
2. Start Docker containers (PostgreSQL, Redis)

### 5. Database Setup

Apply database migrations:

```bash
pnpm run db:migrate
```

### 6. Start Development Server

```bash
pnpm run start:dev
```

The server will start at `http://localhost:3000`.

## Verify Installation

### Health Check

```bash
curl http://localhost:3000/api/v1/health
```

## Common Commands

| Command               | Description              |
| --------------------- | ------------------------ |
| `pnpm run start:dev`  | Start development server |
| `pnpm run build`      | Build for production     |
| `pnpm run start:prod` | Start production server  |
| `pnpm run lint`       | Run ESLint               |
| `pnpm run test`       | Run tests                |
| `pnpm run db:studio`  | Open Prisma Studio       |
| `pnpm run db:migrate` | Run database migrations  |

## Next Steps

- Read about [Project Structure](../project-structure/folder-structure.md)
- Review [Code Conventions](../development/code-conventions.md)
