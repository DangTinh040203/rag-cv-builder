# 🔍 Backend Code Audit Report

> **Ngày audit:** 2026-03-05
> **Phạm vi:** Toàn bộ `src/` (72 file TypeScript, không tính Prisma generated)
> **Framework:** NestJS + Prisma + TypeScript

> **✅ TRẠNG THÁI: ĐÃ GIẢI QUYẾT (RESOLVED)**
> Toàn bộ các vấn đề (Critical, Important, Nice-to-have) liệt kê trong tài liệu này đã được giải quyết qua 5 Phase refactoring (từ Cleanup, Infrastructure, Architecture, SRP đến Testing). Tài liệu này hiện được giữ lại như một historical record (lịch sử) để tham khảo.

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Vi phạm SOLID](#2-vi-phạm-solid)
3. [Vấn đề OOP](#3-vấn-đề-oop)
4. [Vấn đề Design Pattern](#4-vấn-đề-design-pattern)
5. [Type Safety & TypeScript](#5-type-safety--typescript)
6. [Kiến trúc & Code Structure](#6-kiến-trúc--code-structure)
7. [Error Handling](#7-error-handling)
8. [Testing](#8-testing)
9. [Security & Performance](#9-security--performance)
10. [Code Duplication](#10-code-duplication)
11. [Minor Issues](#11-minor-issues)

---

## 1. Tổng quan

| Thống kê                        | Giá trị               |
| ------------------------------- | --------------------- |
| Tổng số file TS (non-generated) | 72                    |
| Modules                         | 3 (rag, resume, user) |
| Unit test files                 | **0** ❌              |
| Integration test files          | **0** ❌              |
| Lỗi `any` type (user code)      | 2 file                |
| Dead code files                 | 1+                    |

### Đánh giá tổng quan

Dự án đã có **nền tảng kiến trúc tốt** — áp dụng Clean Architecture 4 layers (domain → application → infrastructure → presentation), sử dụng DI tokens cho repository/strategy, có interface abstraction. Tuy nhiên, còn **nhiều lỗi chi tiết** trong việc triển khai, đặc biệt liên quan đến SOLID, domain modeling, type safety, và testing.

---

## 2. Vi phạm SOLID

### 2.1. ❌ **Single Responsibility Principle (SRP)** — `ResumeService`

**File:** `src/modules/resume/application/services/resume.service.ts`

`ResumeService` đang chịu trách nhiệm **quá nhiều thứ**:

- CRUD operations (findById, findByUserId, update, delete)
- PDF parsing (`resumeParser`)
- CV-JD matching logic (`matchResume`)
- Authorization checks (kiểm tra `userId`)

**Vấn đề cụ thể:**

```typescript
// Line 31-45: PDF parsing logic nằm trực tiếp trong service
async resumeParser(file: Express.Multer.File) {
  const dataBuffer = file.buffer;
  const parser = new PDFParse({ data: dataBuffer });
  const data = await parser.getText();
  // ...gọi LLM để parse
}

// Line 47-92: Matching logic cũng nằm trong cùng 1 service
async matchResume(resumeId: string, jobDescriptionText: string, userId: string) {
  // ...build prompt, gọi LLM, parse JSON
}
```

**Nên tách thành:**

- `ResumeService` — chỉ CRUD
- `ResumeParserService` — xử lý PDF parsing + LLM
- `ResumeMatchingService` — xử lý CV-JD matching
- Authorization logic nên được trích xuất ra Guard/Interceptor riêng

---

### 2.2. ❌ **SRP** — `UserCreatedStrategy` vi phạm ranh giới module

**File:** `src/modules/user/application/strategies/user-created.strategy.ts`

Strategy này vừa tạo User, vừa tạo Resume mặc định:

```typescript
// Line 52-81: Tạo user rồi tạo luôn resume
const newUser = await this.userRepository.create({ ... });
await this.resumeRepository.create(newUser.id, {
  title: 'Full Name',
  subTitle: 'Fullstack Developer',
  // ...hardcoded default data (dòng 61-81)
});
```

**Vấn đề:**

- Vi phạm SRP: User strategy không nên biết về Resume domain
- Vi phạm module boundary: User module inject `RESUME_REPOSITORY_TOKEN` từ Resume module
- Hardcoded default resume data nằm chết trong code
- Gây ra `forwardRef(() => ResumeModule)` / `forwardRef(() => UserModule)` — circular dependency

---

### 2.3. ❌ **Open/Closed Principle (OCP)** — `BootstrapApplication`

**File:** `src/main.ts`

```typescript
class BootstrapApplication {
  app: INestApplication; // ← public field, không encapsulate

  private setupMiddleware() {
    // Mọi middleware được hardcode trong 1 method
    this.app.use(cookieParser());
    this.app.useGlobalPipes(new ValidationPipe({ ... }));
    this.app.useGlobalFilters(new GlobalExceptionFilter());
    this.app.enableCors({ ... });
    this.app.use(helmet());
    this.app.use(morgan('dev'));
  }
}
```

**Vấn đề:** Muốn thêm/bỏ middleware phải sửa trực tiếp `setupMiddleware()`, không mở rộng được. Tuy nhiên, đây là lỗi nhẹ vì bootstrap thường ít thay đổi.

---

### 2.4. ❌ **Dependency Inversion Principle (DIP)** — `PrismaService` được đăng ký nhiều nơi

**Files:**

- `src/libs/databases/database.module.ts` — đăng ký `PrismaService`
- `src/modules/resume/resume.module.ts` — **lại đăng ký** `PrismaService`
- `src/modules/user/user.module.ts` — **lại đăng ký** `PrismaService`

```typescript
// database.module.ts
@Module({
  providers: [PrismaService],
})
export class DatabaseModule {}

// resume.module.ts — DUPLICATE!
providers: [
  PrismaService, // ← Không cần, đã có trong DatabaseModule
  //...
];

// user.module.ts — DUPLICATE!
providers: [
  PrismaService, // ← Không cần, đã có trong DatabaseModule
  //...
];
```

**Vấn đề:**

- Tạo ra **nhiều instance** của `PrismaService` (mỗi module 1 instance riêng)
- `DatabaseModule` không export `PrismaService`, nên các module khác không dùng được → phải tự đăng ký
- Nên chuyển `DatabaseModule` thành `@Global()` module và export `PrismaService`

---

### 2.5. ❌ **Interface Segregation Principle (ISP)** — Repository interfaces quá rộng

**File:** `src/modules/user/application/interfaces/user-repo.interface.ts`

```typescript
export interface IUserRepository {
  create(payload: CreateUserDto): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByProviderId(providerId: string): Promise<User | null>;
  delete(id: string): Promise<void>;
  update(id: string, payload: UpdateUserDto): Promise<User>;
}
```

**Vấn đề:** Mọi consumer đều phải implement toàn bộ interface, kể cả khi chỉ cần `findByProviderId`. Nên tách thành:

- `IReadUserRepository` (find operations)
- `IWriteUserRepository` (create, update, delete)

---

### 2.6. ❌ **DIP** — Repository Interface phụ thuộc Presentation DTOs

**Files:**

- `src/modules/resume/application/interfaces/resume-repo.interface.ts`
- `src/modules/user/application/interfaces/user-repo.interface.ts`

```typescript
// resume-repo.interface.ts
import {
  type CreateResumeDto,
  type UpdateResumeDto,
} from '@/modules/resume/presentation/DTOs';

export interface IResumeRepository {
  create(userId: string, payload: CreateResumeDto): Promise<Resume>;
  update(id: string, payload: UpdateResumeDto): Promise<Resume>;
}
```

**Vấn đề nghiêm trọng:** Application layer (interface) import từ Presentation layer (DTOs). Đây là **vi phạm hướng phụ thuộc** trong Clean Architecture:

```
Domain ← Application ← Infrastructure
                     ↖ Presentation   ← ĐÂY LÀ SAI!
```

Application layer **KHÔNG được** phụ thuộc vào Presentation layer. Nên tạo riêng domain-level input types (command objects) trong `application/` hoặc `domain/`.

---

## 3. Vấn đề OOP

### 3.1. ❌ **Anemic Domain Model** — Domain chỉ là interfaces

**Files:**

- `src/modules/resume/domain/resume.domain.ts`
- `src/modules/user/domain/user.domain.ts`

```typescript
// user.domain.ts — chỉ là plain interface, không có behavior
export interface User {
  id: string;
  providerId: string;
  provider: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

**Vấn đề:**

- Domain entities chỉ là **data containers** (DTO) — không có business logic
- Không có methods, validation rules, hay domain events
- Toàn bộ business logic nằm ở Service layer → mất đi bản chất OOP

**Nên có:**

```typescript
export class User {
  // ... properties

  getFullName(): string { ... }
  isActive(): boolean { ... }
  changeEmail(newEmail: string): void { /* validation */ }
}
```

---

### 3.2. ❌ **Missing Encapsulation** — `BootstrapApplication.app` là public

**File:** `src/main.ts` (line 21)

```typescript
class BootstrapApplication {
  app: INestApplication; // ← Public, có thể bị truy cập bên ngoài
  private configService: ConfigService;
}
```

Nên khai báo `private app: INestApplication;`

---

### 3.3. ❌ **Domain Entity là class nhưng không có constructor** — `RagResponseEntity`

**File:** `src/modules/rag/domain/entities/rag-response.entity.ts`

```typescript
export class RagResponseEntity {
  content: string;
  metadata?: Record<string, any>; // ← any ở đây
}
```

**Vấn đề:**

- Class không có constructor → khó kiểm soát khởi tạo
- Sử dụng `Record<string, any>` — mất type safety
- **File này không được import/sử dụng ở bất kỳ đâu** → Dead Code

---

## 4. Vấn đề Design Pattern

### 4.1. ⚠️ **Strategy Pattern** — Token sử dụng string thay vì Symbol

**File:** `src/modules/user/application/interfaces/clerk-webhook-strategy.interface.ts`

```typescript
export const CLERK_STRATEGY = 'CLERK_STRATEGY'; // ← string token
```

So sánh với RAG module:

```typescript
export const LLM_PROVIDER_TOKEN = Symbol('LLM_PROVIDER_TOKEN'); // ← Symbol token ✅
```

**Vấn đề:** Không nhất quán. Nên thống nhất dùng `Symbol` cho tất cả DI tokens để tránh xung đột tên.

---

### 4.2. ⚠️ **Strategy Pattern** — Đăng ký strategy bằng useFactory thủ công

**File:** `src/modules/user/user.module.ts` (line 38-46)

```typescript
{
  provide: CLERK_STRATEGY,
  useFactory: (
    userCreatedStrategy: UserCreatedStrategy,
    userUpdatedStrategy: UserUpdatedStrategy,
    userDeletedStrategy: UserDeletedStrategy,
  ) => [userCreatedStrategy, userUpdatedStrategy, userDeletedStrategy],
  inject: [UserCreatedStrategy, UserUpdatedStrategy, UserDeletedStrategy],
}
```

**Vấn đề:** Mỗi khi thêm strategy mới phải sửa 2 nơi:

1. Tạo file strategy mới
2. Sửa `user.module.ts` để thêm vào array

Nên dùng **auto-discovery** hoặc NestJS `DiscoveryModule` để tự động tìm strategies.

---

### 4.3. ❌ **Repository Pattern** — `DatabaseModule` không export `PrismaService`

**File:** `src/libs/databases/database.module.ts`

```typescript
@Module({
  controllers: [], // ← controllers rỗng, không cần
  providers: [PrismaService],
  // ← THIẾU exports: [PrismaService]
})
export class DatabaseModule {}
```

Kết quả: mỗi module phải tự đăng ký `PrismaService`, phá vỡ singleton pattern của database connection.

---

### 4.4. ⚠️ **Adapter Pattern** — Thiếu error handling và retry

**File:** `src/modules/rag/infrastructure/adapters/gemini.adapter.ts`

```typescript
async sendMessage(content: string, schema?: Schema) {
  // Không có retry logic
  // Không có timeout handling
  // Không có rate limit handling
  const response = await this.genAI.models.generateContent({ ... });

  if (!response.text) {
    throw new InternalServerErrorException(); // ← Generic error, không có context
  }
}
```

External API call nên có: retry mechanism, timeout, circuit breaker pattern.

---

### 4.5. ❌ **Empty Controller** — `RagController`

**File:** `src/modules/rag/presentation/controllers/rag.controller.ts`

```typescript
@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}
  // ← KHÔNG CÓ ENDPOINT NÀO
}
```

Controller rỗng, không có route handler nào. Nên xóa hoặc implement endpoints.

---

## 5. Type Safety & TypeScript

### 5.1. ❌ **Sử dụng `any` type**

| File                                                               | Dòng | Code                                                   |
| ------------------------------------------------------------------ | ---- | ------------------------------------------------------ |
| `libs/cache/cache.module.ts`                                       | 16   | `useFactory: (configService: ConfigService): any => {` |
| `modules/resume/presentation/interceptors/parse-jd.interceptor.ts` | 15   | `Promise<Observable<any>>`                             |
| `modules/rag/domain/entities/rag-response.entity.ts`               | 3    | `metadata?: Record<string, any>`                       |

**Fix:** Định nghĩa proper return types thay vì dùng `any`.

---

### 5.2. ❌ **Missing return types** trên nhiều methods

**File:** `src/modules/resume/application/services/resume.service.ts`

```typescript
// Line 31 — không có return type
async resumeParser(file: Express.Multer.File) { ... }

// Line 47 — không có return type
async matchResume(resumeId: string, jobDescriptionText: string, userId: string) { ... }
```

**File:** `src/modules/rag/application/services/rag.service.ts`

```typescript
// Line 16 — không có return type
async sendMessage(content: string, schema?: Schema) { ... }
```

**File:** `src/modules/rag/infrastructure/adapters/gemini.adapter.ts`

```typescript
// Line 30 — không có return type
async sendMessage(content: string, schema?: Schema) { ... }
```

Nên luôn khai báo explicit return type cho mọi public method.

---

### 5.3. ⚠️ **`JSON.parse` trả về `any` không được validate**

**File:** `src/modules/resume/application/services/resume.service.ts`

```typescript
// Line 41: Parse JSON từ LLM nhưng không validate structure
try {
  return JSON.parse(response); // ← trả về any, không validate schema
} catch {
  throw new Error('Failed to parse LLM response as JSON: ' + response);
}
```

LLM response nên được validate bằng Zod/class-validator trước khi trả về client.

---

## 6. Kiến trúc & Code Structure

### 6.1. ❌ **Circular Dependency** giữa UserModule ↔ ResumeModule

```typescript
// user.module.ts
@Module({
  imports: [forwardRef(() => ResumeModule)],
})

// resume.module.ts
@Module({
  imports: [forwardRef(() => UserModule)],
})
```

`forwardRef` là **code smell** — báo hiệu rằng module boundaries chưa đúng. Root cause: `UserCreatedStrategy` inject `RESUME_REPOSITORY_TOKEN` (thuộc Resume module).

**Fix:** Dùng Event-based approach: `UserCreatedStrategy` emit event → `ResumeModule` lắng nghe và tạo default resume.

---

### 6.2. ⚠️ **Duplicated authorization logic** trong `ResumeService`

**File:** `src/modules/resume/application/services/resume.service.ts`

Pattern sau được lặp lại **4 lần** (matchResume, update, findById, delete):

```typescript
const resume = await this.resumeRepository.findById(id);
if (!resume) {
  throw new NotFoundException(`Resume with id ${id} not found`);
}
if (resume.userId !== userId) {
  throw new ForbiddenException('You do not have permission to ...');
}
```

**Fix:** Trích xuất thành method `findAndAuthorize(id, userId)` hoặc tốt hơn là dùng NestJS Guard/Policy-based authorization (CASL).

---

### 6.3. ⚠️ **Inconsistent update strategy** — `deleteMany + create`

**File:** `src/modules/resume/infrastructure/repositories/prisma-resume.repo.ts`

```typescript
async update(id: string, payload: UpdateResumeDto): Promise<Resume> {
  return this.prisma.resume.update({
    data: {
      information: {
        deleteMany: {}, // ← Xóa hết rồi tạo lại
        create: payload.information,
      },
      // Lặp lại cho mọi relation...
    },
  });
}
```

**Vấn đề:**

- Xóa hết rồi insert lại → mất `id` cũ của các records con
- Không atomic nếu có failure giữa chừng
- Performance kém khi data lớn
- Nên dùng upsert strategy hoặc diff-based update

---

### 6.4. ⚠️ **`resumeInclude` fetch tất cả relations mọi lúc**

**File:** `src/modules/resume/infrastructure/repositories/prisma-resume.repo.ts` (line 11-20)

```typescript
const resumeInclude = {
  information: true,
  educations: true,
  workExperiences: true,
  projects: true,
  skills: true,
  certifications: true,
  languages: true,
  user: true, // ← Luôn include user
} as const;
```

**Vấn đề:** Mọi query đều fetch **tất cả relations** kể cả khi không cần. Query `findById` cho trang list không cần workExperiences, projects, etc. → performance issue khi data lớn.

---

## 7. Error Handling

### 7.1. ❌ **`throw new Error()`** thay vì NestJS HttpException

**File:** `src/modules/resume/application/services/resume.service.ts`

```typescript
// Line 43
throw new Error('Failed to parse LLM response as JSON: ' + response);

// Line 88
throw new Error('Failed to parse LLM match response as JSON: ' + response);
```

`new Error()` sẽ bị `GlobalExceptionFilter` bắt và trả về **500 Internal Server Error**, kèm response text (có thể chứa sensitive data). Nên dùng `InternalServerErrorException` hoặc custom exception.

---

### 7.2. ⚠️ **`GlobalExceptionFilter` dùng `process.env` trực tiếp**

**File:** `src/libs/filters/http-exception.filter.ts` (line 82)

```typescript
const isProduction = process.env.NODE_ENV === 'production';
```

**Vấn đề:** Toàn bộ app dùng `ConfigService` qua DI, nhưng filter lại đọc `process.env` trực tiếp. Filter nên inject `ConfigService` hoặc dùng `APP_FILTER` provider registration thay vì `new GlobalExceptionFilter()`.

Trong `main.ts` (line 61):

```typescript
this.app.useGlobalFilters(new GlobalExceptionFilter());
// ← new bằng tay → không có DI → không inject được ConfigService
```

---

### 7.3. ⚠️ **Webhook guard trả về `false` thay vì throw exception**

**File:** `src/modules/user/presentation/guards/clerk-webhook.guard.ts`

```typescript
if (!svixHeaders['svix-id'] || ...) {
  this.logger.error('Missing svix headers');
  return false; // ← Client nhận 403 Forbidden, không có error message
}
```

Nên `throw new ForbiddenException('Missing svix headers')` để client biết lý do.

---

## 8. Testing

### 8.1. ❌ **KHÔNG CÓ BẤT KỲ TEST NÀO**

```
$ find src -name '*.spec.ts' → 0 results
$ find src -name '*.test.ts' → 0 results
```

**Đây là vấn đề nghiêm trọng nhất.** Không có:

- Unit tests cho services, strategies
- Integration tests cho controllers
- E2E tests cho API endpoints

**Priority files cần test đầu tiên:**

1. `ResumeService` — core business logic
2. `ClerkWebhookService` — webhook processing
3. Mỗi Strategy (UserCreated, UserUpdated, UserDeleted)
4. `ClerkAuthGuard` — authentication
5. `ClerkWebhookGuard` — webhook verification

---

## 9. Security & Performance

### 9.1. ⚠️ **Endpoint `/resumes/parse` là Public**

**File:** `src/modules/resume/presentation/controllers/resume.controller.ts` (line 29)

```typescript
@Public()
@Post('/parse')
async parse(@UploadedFile(...) file: Express.Multer.File) {
  return this.resumeService.resumeParser(file);
}
```

Endpoint này gọi LLM API (tốn tiền) nhưng lại **public** — ai cũng gọi được. Nên yêu cầu authentication hoặc ít nhất rate limiting riêng.

---

### 9.2. ⚠️ **Token extraction thiếu validation**

**File:** `src/libs/guards/clerk-auth.guard.ts` (line 41)

```typescript
const token: string = authHeader.replace('Bearer ', '');
```

Nếu header là `"Basic abc123"`, token sẽ là `"Basic abc123"` (không replace gì). Nên dùng:

```typescript
if (!authHeader.startsWith('Bearer ')) {
  throw new UnauthorizedException('Invalid authorization scheme');
}
const token = authHeader.slice(7);
```

---

### 9.3. ⚠️ **Không có request logging cho webhook**

Webhook endpoint log `backup_code_enabled` (vô nghĩa):

```typescript
this.logger.log(
  'Clerk webhook received:',
  req.clerkEvent?.data.backup_code_enabled,
);
```

Nên log event type thay vì random field.

---

## 10. Code Duplication

### 10.1. ❌ **`CreateUserDto` và `UpdateUserDto` giống nhau 100%**

**Files:**

- `src/modules/user/presentation/DTOs/create-user.dto.ts`
- `src/modules/user/presentation/DTOs/update-user.dto.ts`

Hai file có nội dung **hoàn toàn giống nhau** (34 lines). `UpdateUserDto` nên extend `PartialType(CreateUserDto)` giống cách `UpdateResumeDto` đã làm trong Resume module.

---

### 10.2. ⚠️ **Authorization check lặp lại 4 lần** trong `ResumeService`

Đã đề cập ở mục 6.2. Pattern `findById → check null → check userId` xuất hiện ở:

- `matchResume()` (line 52-61)
- `update()` (line 99-108)
- `findById()` (line 114-123)
- `delete()` (line 133-142)

---

### 10.3. ⚠️ **`Logger` được khai báo lặp lại thay vì inject nhất quán**

Một số nơi tạo Logger riêng:

```typescript
private readonly logger = new Logger(ResumeService.name); // tự tạo
```

Một số nơi inject qua DI:

```typescript
constructor(private readonly logger: Logger) {} // inject
```

Nên thống nhất 1 approach.

---

## 11. Minor Issues

### 11.1. ⚠️ **`@Inject()` rỗng** trong `GeminiAdapter`

**File:** `src/modules/rag/infrastructure/adapters/gemini.adapter.ts` (line 22-23)

```typescript
constructor(
  @Inject() private readonly configService: ConfigService,
  @Inject() private readonly logger: Logger,
) {}
```

`@Inject()` không có token → không cần thiết vì NestJS tự inject theo type.

---

### 11.2. ⚠️ **Dead code** — `RagResponseEntity`

**File:** `src/modules/rag/domain/entities/rag-response.entity.ts`

File không được import ở bất kỳ đâu trong codebase. Nên xóa hoặc sử dụng.

---

### 11.3. ⚠️ **`POST /:id`** cho update thay vì `PUT`/`PATCH`

**File:** `src/modules/resume/presentation/controllers/resume.controller.ts` (line 66)

```typescript
@Post('/:id') // ← Nên dùng @Put() hoặc @Patch()
async update(...) { ... }
```

RESTful convention: `POST` = create, `PUT`/`PATCH` = update.

---

### 11.4. ⚠️ **CRLF line endings** trong một số file

**Files:** `database.module.ts`, `user.module.ts` sử dụng CRLF (`\r\n`) trong khi phần còn lại dùng LF (`\n`). Nên thống nhất với `.editorconfig` hoặc `.gitattributes`.

---

### 11.5. ⚠️ **`GetUserDto`** không được sử dụng

**File:** `src/modules/user/presentation/DTOs/get-user.dto.ts`

Không có controller hay service nào sử dụng DTO này.

---

## Tổng hợp theo mức độ ưu tiên

### 🔴 Critical (Sửa ngay)

| #   | Vấn đề                                             | File chính                                           |
| --- | -------------------------------------------------- | ---------------------------------------------------- |
| 1   | Không có test nào                                  | Toàn bộ `src/`                                       |
| 2   | Repository interface import Presentation DTOs      | `resume-repo.interface.ts`, `user-repo.interface.ts` |
| 3   | Circular dependency UserModule ↔ ResumeModule      | `user.module.ts`, `resume.module.ts`                 |
| 4   | `PrismaService` đăng ký trùng lặp → nhiều instance | 3 modules                                            |
| 5   | `throw new Error()` thay vì HttpException          | `resume.service.ts`                                  |
| 6   | Public endpoint gọi LLM API tốn tiền               | `resume.controller.ts`                               |

### 🟡 Important (Sửa sớm)

| #   | Vấn đề                            | File chính                                   |
| --- | --------------------------------- | -------------------------------------------- |
| 7   | `ResumeService` vi phạm SRP       | `resume.service.ts`                          |
| 8   | Anemic Domain Model               | `user.domain.ts`, `resume.domain.ts`         |
| 9   | Authorization logic lặp 4 lần     | `resume.service.ts`                          |
| 10  | `any` types trong user code       | `cache.module.ts`, `parse-jd.interceptor.ts` |
| 11  | Missing return types              | Nhiều services                               |
| 12  | `CreateUserDto` = `UpdateUserDto` | 2 DTO files                                  |

### 🟢 Nice to have

| #   | Vấn đề                                                               | File chính             |
| --- | -------------------------------------------------------------------- | ---------------------- |
| 13  | DI token không nhất quán (string vs Symbol)                          | Strategy interfaces    |
| 14  | Dead code (`RagResponseEntity`, `GetUserDto`, empty `RagController`) | 3 files                |
| 15  | `POST /:id` thay vì `PUT/PATCH`                                      | `resume.controller.ts` |
| 16  | CRLF inconsistency                                                   | 2 files                |
| 17  | Webhook logging vô nghĩa                                             | `user.controller.ts`   |
