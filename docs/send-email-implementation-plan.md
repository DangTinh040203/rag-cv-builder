# Send Application Email Feature — Implementation Plan

## Overview

Hiện tại hệ thống chỉ **generate email subject + body** (qua AI/LLM). Feature mới sẽ cho phép user **gửi email apply trực tiếp** từ ứng dụng, kèm theo file CV dạng PDF.

**Flow tổng quát:**

1. User click "Send Email" button trên `EmailPreviewDialog`
2. Hiện dialog form nhập `from`, `to` (tự động điền nếu backend trích xuất được từ JD)
3. Frontend generate PDF blob từ resume → gửi lên backend cùng `subject`, `body`, `from`, `to`
4. Backend gửi email qua **Resend** API với PDF attachment
5. Backend lưu thông tin Application vào database

---

## 1. Backend Changes

### 1.1 Database — Prisma Schema

#### [NEW] `application.prisma`

**Path:** `src/libs/databases/prisma/schema/application.prisma`

```prisma
model Application {
  id        String   @id @default(uuid())

  resumeId  String
  resume    Resume   @relation(fields: [resumeId], references: [id], onDelete: Cascade)

  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  fromEmail String
  toEmail   String
  subject   String
  body      String   @db.Text

  sentAt    DateTime @default(now())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([resumeId])
  @@map("applications")
}
```

#### [MODIFY] `resume.prisma`

Thêm relation `applications Application[]` vào model `Resume`.

#### [MODIFY] `user.prisma`

Thêm relation `applications Application[]` vào model `User`.

---

### 1.2 Application Layer — Service

#### [NEW] `send-email.service.ts`

**Path:** `src/modules/resume/application/services/send-email.service.ts`

- Inject `PrismaService` (hoặc `ApplicationRepository`) + Resend client
- Method `sendApplicationEmail(dto)`:
  1. Gọi Resend API để gửi email với PDF attachment (buffer từ multipart upload)
  2. Lưu record `Application` vào DB
  3. Return application record

#### [MODIFY] `src/modules/resume/application/services/index.ts`

Export thêm `SendEmailService`.

---

### 1.3 Application Layer — Email Generation Response Update

#### [MODIFY] `email-generation.service.ts`

**Path:** `src/modules/resume/application/services/email-generation.service.ts`

- Update return type từ `{ subject, body }` → `{ subject, body, suggestedFrom?, suggestedTo? }`
- Parse thêm `suggestedFrom`, `suggestedTo` từ LLM response

#### [MODIFY] `prompt.constant.ts`

**Path:** `src/modules/resume/application/constants/prompt.constant.ts`

- Update `GENERATE_EMAIL_PROMPT`: Thêm instruction yêu cầu LLM trích xuất email apply từ JD nếu có
- Update `GENERATE_EMAIL_SCHEMA`: Thêm `suggestedFrom` (nullable) + `suggestedTo` (nullable)

---

### 1.4 Presentation Layer — DTO

#### [NEW] `send-email.dto.ts`

**Path:** `src/modules/resume/presentation/DTOs/send-email.dto.ts`

```typescript
export class SendEmailDto {
  @IsNotEmpty() @IsEmail() fromEmail: string;
  @IsNotEmpty() @IsEmail() toEmail: string;
  @IsNotEmpty() @IsString() subject: string;
  @IsNotEmpty() @IsString() body: string;
}
```

> File PDF sẽ được gửi qua `multipart/form-data` cùng với DTO fields.

#### [MODIFY] `src/modules/resume/presentation/DTOs/index.ts`

Export thêm `SendEmailDto`.

---

### 1.5 Presentation Layer — Controller

#### [MODIFY] `resume.controller.ts`

**Path:** `src/modules/resume/presentation/controllers/resume.controller.ts`

Thêm endpoint:

```typescript
@Throttle({ default: { ttl: 60000, limit: 3 } })
@UseInterceptors(FileInterceptor('resumeFile'))
@Post('/:id/send-email')
async sendEmail(
  @Param('id') id: string,
  @Body() payload: SendEmailDto,
  @UploadedFile(...) resumeFile: Express.Multer.File,
  @CurrentDbUser() user: User,
) { ... }
```

---

### 1.6 Infrastructure Layer — Repository

#### [NEW] `prisma-application.repo.ts`

**Path:** `src/modules/resume/infrastructure/repositories/prisma-application.repo.ts`

- Repository pattern tương tự `prisma-resume.repo.ts`
- Method: `create(data)`, `findByUserId(userId)`

---

### 1.7 Module Registration

#### [MODIFY] `resume.module.ts`

- Register `SendEmailService`, `APPLICATION_REPOSITORY_TOKEN`, `PrismaAdapterApplicationRepository`

---

### 1.8 Resend Integration

#### [NEW] Resend config/module (nếu chưa có)

- Tạo `ResendModule` hoặc inject trực tiếp trong `SendEmailService` dùng `RESEND_API_KEY` từ env
- Sử dụng package `resend` (npm)

---

## 2. Frontend Changes

### 2.1 Generate PDF as Blob (reusable util)

#### [NEW] `generate-pdf-blob.ts`

**Path:** `utils/generate-pdf-blob.ts`

- Extract logic từ `download-pdf.tsx` → tạo util function `generatePdfBlob(resume, templateSelected, templateFormat): Promise<Blob>`
- `download-pdf.tsx` sẽ import và dùng util này thay vì inline logic

---

### 2.2 Types Update

#### [MODIFY] `types/resume.type.ts`

- Update `GenerateEmailResponse`: thêm `suggestedFrom?: string`, `suggestedTo?: string`
- Thêm `SendEmailPayload` interface
- Thêm `Application` interface (response từ BE sau khi send)

---

### 2.3 Service Layer

#### [MODIFY] `services/resume.service.ts`

Thêm method:

```typescript
async sendEmail(resumeId: string, formData: FormData): Promise<Application> {
  const { data } = await this.post<FormData, Application>(
    `/resumes/${resumeId}/send-email`,
    formData,
  );
  return data;
}
```

---

### 2.4 Send Email Dialog Form

#### [NEW] `send-email-dialog.tsx`

**Path:** `components/builder-screen/matching/send-email-dialog.tsx`

- Dialog form với fields: `From Email`, `To Email` (auto-filled từ `suggestedFrom`/`suggestedTo`)
- Hiển thị subject + body (read-only preview)
- Button "Send Application" → generate PDF blob → tạo FormData → gọi `resumeService.sendEmail()`
- Styles follow theme hiện tại (sử dụng shadcn/ui Dialog, Input, Button, etc.)
- Loading state khi đang gửi

---

### 2.5 Integration vào EmailPreviewDialog

#### [MODIFY] `email-preview-dialog.tsx`

- Thêm button "Send Email" ở footer (bên cạnh "Copy to Clipboard")
- Click → mở `SendEmailDialog` với data `emailResult`

#### [MODIFY] `matching-result.tsx`

- Pass thêm `resume` prop xuống để `SendEmailDialog` có thể generate PDF
- Pass thêm `templateSelected`, `templateFormat` từ store

---

## 3. Verification Plan

### Manual Verification (yêu cầu user test)

1. **Generate Email flow**: Verify response giờ có thêm `suggestedFrom`/`suggestedTo` khi JD chứa email
2. **Send Email Dialog**: Click "Send Email" → dialog hiện form với `from`/`to` auto-filled
3. **PDF Generation**: Verify PDF blob được generate đúng template
4. **Email Delivery**: Check email thực sự được gửi qua Resend (check Resend dashboard)
5. **Database Record**: Verify record Application được tạo trong DB sau khi gửi thành công
6. **Error Handling**: Test case khi email invalid, Resend API fail, etc.

### Automated (nếu có test setup)

- Chạy `pnpm lint` ở cả FE + BE để verify code convention
- Chạy Prisma migrate: `npx prisma migrate dev --name add_application_table`
