# RAG CV Builder - Backend API

[![CI](https://github.com/DangTinh040203/rag-cv-builder/actions/workflows/ci.yml/badge.svg)](https://github.com/DangTinh040203/rag-cv-builder/actions/workflows/ci.yml)
[![NestJS](https://img.shields.io/badge/NestJS-11.x-ea2845.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.x-2D3748.svg)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/License-UNLICENSED-red.svg)]()

> 🚀 A powerful backend API for building intelligent CV/Resume with RAG (Retrieval-Augmented Generation) capabilities.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Scripts](#-scripts)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [Docker](#-docker)
- [License](#-license)

## ✨ Features

- 🔐 **Authentication** - Clerk integration for secure user authentication
- 📄 **CV Management** - Create, update, and manage CV/Resume data
- 🗄️ **Database** - PostgreSQL with Prisma ORM
- 📦 **Caching** - Redis caching with Keyv
- 📝 **API Documentation** - Swagger/OpenAPI integration
- 🔒 **Security** - Helmet, CORS, and validation pipes
- 🐳 **Docker Ready** - Containerized development and production

## 🛠 Tech Stack

| Category           | Technology        |
| ------------------ | ----------------- |
| **Framework**      | NestJS 11         |
| **Language**       | TypeScript 5      |
| **Database**       | PostgreSQL        |
| **ORM**            | Prisma 7          |
| **Authentication** | Clerk             |
| **Caching**        | Redis (Keyv)      |
| **API Docs**       | Swagger           |
| **Testing**        | Jest              |
| **Linting**        | ESLint + Prettier |

## 📦 Prerequisites

- **Node.js** >= 20.x
- **pnpm** >= 9.x
- **Docker** & **Docker Compose** (for local database)
- **PostgreSQL** (or use Docker)

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/DangTinh040203/rag-cv-builder.git
cd rag-cv-builder
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Setup development environment

```bash
# Generate Prisma client and start Docker containers (PostgreSQL)
pnpm run dev:setup
```

### 5. Run database migrations

```bash
pnpm run db:migrate
```

### 6. Setup ngrok for Clerk webhooks (Optional)

To receive Clerk webhook events during local development, you need to expose your local server using ngrok:

#### Install ngrok

```bash
# macOS (Homebrew)
brew install ngrok

# Linux (Snap)
sudo snap install ngrok

# Or download directly from https://ngrok.com/download
```

#### Configure ngrok

```bash
# Sign up at https://ngrok.com and get your authtoken
ngrok config add-authtoken <your-authtoken>
```

#### Start ngrok tunnel

```bash
# Expose your local server (default port 3000)
ngrok http 3000
```

#### Configure Clerk webhook

1. Copy the ngrok forwarding URL (e.g., `https://xxxx-xx-xx-xx-xx.ngrok-free.app`)
2. Go to [Clerk Dashboard](https://dashboard.clerk.com) → **Webhooks**
3. Add a new endpoint: `<ngrok-url>/api/v1/users/webhook`
4. Select the events you want to listen to (e.g., `user.created`, `user.updated`, `user.deleted`)
5. Copy the **Signing Secret** and add it to your `.env` file as `CLERK_WEBHOOK_SECRET`

### 7. Start the development server

```bash
pnpm run start:dev
```

The API will be available at `http://localhost:3000`

## 📁 Project Structure

```
src/
├── app/              # Application configuration
├── libs/             # Shared libraries (auth, cache, database, etc.)
├── modules/          # Feature modules
└── main.ts           # Application entry point

docker/               # Docker configuration
docs/                 # Documentation (Docsify)
prisma/               # Prisma schema and migrations
```

## 📜 Scripts

### Development

| Script             | Description                                        |
| ------------------ | -------------------------------------------------- |
| `pnpm start:dev`   | Start development server with hot-reload           |
| `pnpm start:debug` | Start with debug mode                              |
| `pnpm dev:setup`   | Generate Prisma client and start Docker containers |

### Build & Production

| Script            | Description          |
| ----------------- | -------------------- |
| `pnpm build`      | Build for production |
| `pnpm start:prod` | Run production build |

### Code Quality

| Script          | Description               |
| --------------- | ------------------------- |
| `pnpm lint`     | Run ESLint                |
| `pnpm lint:fix` | Fix ESLint issues         |
| `pnpm format`   | Format code with Prettier |

### Database (Prisma)

| Script                   | Description                     |
| ------------------------ | ------------------------------- |
| `pnpm db:generate`       | Generate Prisma client          |
| `pnpm db:migrate`        | Run database migrations         |
| `pnpm db:migrate:deploy` | Deploy migrations to production |
| `pnpm db:studio`         | Open Prisma Studio              |
| `pnpm db:db:push`        | Push schema changes             |
| `pnpm db:seed`           | Seed the database               |

### Documentation

| Script      | Description                      |
| ----------- | -------------------------------- |
| `pnpm docs` | Serve documentation on port 4000 |

## 🔧 Environment Variables

| Variable                | Description                  | Example                 |
| ----------------------- | ---------------------------- | ----------------------- |
| `PORT`                  | Server port                  | `3000`                  |
| `NODE_ENV`              | Environment mode             | `development`           |
| `API_PREFIX`            | API route prefix             | `api`                   |
| `API_VERSION`           | API version                  | `1`                     |
| `DATABASE_URL`          | PostgreSQL connection string | `postgresql://...`      |
| `CLERK_SECRET_KEY`      | Clerk secret key             | `sk_...`                |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key        | `pk_...`                |
| `CLERK_WEBHOOK_SECRET`  | Clerk webhook secret         | `whsec_...`             |
| `FRONTEND_ORIGIN`       | Frontend URL for CORS        | `http://localhost:3001` |

## 📚 API Documentation

Once the server is running, access Swagger documentation at:

```
http://localhost:3000/api/docs
```

## 🐳 Docker

### Build Docker image

```bash
pnpm docker:build
```

### Run Docker container

```bash
pnpm docker:run
```

### Development with Docker Compose

```bash
cd docker && docker compose up -d
```

## 🔄 CI/CD

This project uses GitHub Actions for continuous integration:

- **Lint** - ESLint checks
- **Format** - Prettier formatting checks
- **TypeScript** - Type checking
- **Build** - Production build verification
- **Test** - Unit tests (coming soon)

Triggered on:

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

## 📄 License

This project is **UNLICENSED** - private and proprietary.

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/DangTinh040203">DangTinh</a>
</p>
