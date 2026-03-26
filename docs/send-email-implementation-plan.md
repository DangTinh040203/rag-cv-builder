# Send Email Feature — Implementation Plan

## 1. Overview & Goal

Implement a **Send Application Email** feature that lets users apply for jobs directly from the CV Builder web app.
The email will include an auto-generated PDF of their CV as an attachment.

## 2. Current State (What Exists Today)

| Layer               | Component                                                                 | Current State                                                                           |
| ------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **BE — LLM Prompt** | `GENERATE_EMAIL_PROMPT` / `GENERATE_EMAIL_SCHEMA` in `prompt.constant.ts` | Returns `{ subject, body }` only. No `emailTo` extraction.                              |
| **BE — Service**    | `EmailGenerationService`                                                  | Calls `RagService` to generate email JSON (subject + body).                             |
| **BE — Controller** | `POST /resumes/:id/generate-email` in `ResumeController`                  | Accepts `{ jobDescription, matchContext }` → returns `{ subject, body }`.               |
| **FE — Service**    | `ResumeService.generateEmail()`                                           | Sends JD + matchResult → gets `{ subject, body }`.                                      |
| **FE — Type**       | `GenerateEmailResponse` in `resume.type.ts`                               | `{ subject: string; body: string }` — no `emailTo`.                                     |
| **FE — UI**         | `EmailPreviewDialog`                                                      | Single-purpose dialog: preview email + edit + copy to clipboard. No sending capability. |
| **FE — PDF**        | `download-pdf.tsx`                                                        | Generates PDF blob via `@react-pdf/renderer` and triggers download.                     |
| **DB**              | No `Application` model                                                    | Nothing tracks sent applications.                                                       |
| **Env**             | `env.config.ts` / `.env.example`                                          | No SMTP / mail provider configs.                                                        |

## 3. Multi-Step Data Flow (Target State)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. User clicks "Generate Application Email"                        │
│    → POST /resumes/:id/generate-email                              │
│    → LLM returns { subject, body, emailTo? }                       │
├─────────────────────────────────────────────────────────────────────┤
│ 2. EmailPreviewDialog opens (Multi-Step)                           │
│    Step 1: Preview — view subject + body (existing UI, enhanced)   │
│    Step 2: Send    — confirm/edit emailTo, subject, body           │
│                    ↳ Click "Send Email"                             │
├─────────────────────────────────────────────────────────────────────┤
│ 3. Frontend generates PDF blob (reusing download-pdf.tsx logic)    │
│    → Packs FormData: emailTo + subject + body + file (PDF blob)    │
│    → POST /resumes/:id/send-email (multipart/form-data)            │
├─────────────────────────────────────────────────────────────────────┤
│ 4. Backend receives FormData                                       │
│    → Creates Application record (status: PENDING)                  │
│    → Dispatches email via IMailProvider (NodemailerProvider)        │
│    → Updates Application status → SENT / FAILED                    │
│    → Returns result to frontend                                    │
└─────────────────────────────────────────────────────────────────────┘
```

## 4. Detailed Changes

### 4.1 Backend — Environment & Config

**Files to modify:**

- `src/libs/configs/env.config.ts` — Add SMTP env keys to `Env` enum and `validationSchema`.
- `.env.example` / `.env` — Add new env vars.

**New env vars:**

```env
# SMTP / Mail Provider
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM="CV Builder <noreply@cvbuilder.app>"
```

---

### 4.2 Backend — Email Module (New module: `src/modules/email`)

Structure following project DDD convention:

```
src/modules/email/
├── application/
│   ├── interfaces/
│   │   └── mail-provider.interface.ts   ← IMailProvider + SendMailOptions
│   └── services/
│       └── email.service.ts             ← EmailService (uses IMailProvider)
├── infrastructure/
│   └── providers/
│       └── nodemailer.provider.ts       ← NodemailerProvider implements IMailProvider
└── email.module.ts                      ← Module with custom provider token
```

**Interface:**

```typescript
export const MAIL_PROVIDER_TOKEN = 'MAIL_PROVIDER_TOKEN';

export interface SendMailOptions {
  from?: string; // Optional, defaults to MAIL_FROM env
  to: string;
  subject: string;
  body: string; // HTML or plain text
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

export interface IMailProvider {
  sendMail(options: SendMailOptions): Promise<{ messageId: string }>;
}
```

**Module registration:**

```typescript
{
  provide: MAIL_PROVIDER_TOKEN,
  useClass: NodemailerProvider,
}
```

> **Scalability**: To switch providers, only change `useClass` to `ResendProvider`, `SendGridProvider`, etc. No other code changes needed.

---

### 4.3 Backend — LLM Prompt & Schema Update

**File:** `src/modules/resume/application/constants/prompt.constant.ts`

- **Prompt** (`GENERATE_EMAIL_PROMPT`): Add instruction to extract the email address from JD if present.
  ```
  11. **Email Extraction**: If the JD contains an email address to send applications to, extract it and include it in the "emailTo" field. If no email is found, set emailTo to null.
  ```
- **Schema** (`GENERATE_EMAIL_SCHEMA`): Add `emailTo` field:
  ```typescript
  emailTo: {
    type: Type.STRING,
    nullable: true,
    description: 'Email address extracted from JD to send the application to. null if not found.',
  },
  ```

---

### 4.4 Backend — Database Schema

**New file:** `src/libs/databases/prisma/schema/application.prisma`

```prisma
model Application {
  id String @id @default(uuid())

  resumeId String
  resume   Resume @relation(fields: [resumeId], references: [id], onDelete: Cascade)

  userId String
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)

  emailTo String
  subject String
  body    String
  status  String @default("PENDING") // PENDING, SENT, FAILED

  appliedAt DateTime @default(now())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([resumeId])
}
```

**Also update:**

- `resume.prisma` — Add `applications Application[]` relation field.
- `user.prisma` — Add `applications Application[]` relation field.

---

### 4.5 Backend — API Endpoint

**File:** `src/modules/resume/presentation/controllers/resume.controller.ts`

New endpoint:

```typescript
@Throttle({ default: { ttl: 60000, limit: 3 } })
@UseInterceptors(FileInterceptor('file'))
@Post('/:id/send-email')
async sendEmail(
  @Param('id') id: string,
  @Body() payload: SendEmailDto,
  @UploadedFile(...) file: Express.Multer.File,
  @CurrentDbUser() user: User,
) { ... }
```

**New DTO:** `SendEmailDto` — `emailTo`, `subject`, `body` (all required strings, validated with `class-validator`).

**Service flow:**

1. Validate ownership of resume.
2. Create `Application` record with status `PENDING`.
3. Call `EmailService.sendMail(...)` with PDF attachment.
4. Update `Application` status to `SENT` or `FAILED`.
5. Return Application record.

---

### 4.6 Frontend — Type Updates

**File:** `apps/web/types/resume.type.ts`

```typescript
export interface GenerateEmailResponse {
  subject: string;
  body: string;
  emailTo: string | null; // ← NEW
}
```

---

### 4.7 Frontend — Service Layer

**File:** `apps/web/services/resume.service.ts`

Add new method:

```typescript
async sendEmail(
  resumeId: string,
  emailTo: string,
  subject: string,
  body: string,
  pdfBlob: Blob,
  pdfFilename: string,
): Promise<SendEmailResponse> {
  const formData = new FormData();
  formData.append('emailTo', emailTo);
  formData.append('subject', subject);
  formData.append('body', body);
  formData.append('file', pdfBlob, pdfFilename);

  const { data } = await this.post<FormData, SendEmailResponse>(
    `/resumes/${resumeId}/send-email`,
    formData,
  );
  return data;
}
```

---

### 4.8 Frontend — UI (Multi-Step Dialog)

**File:** `apps/web/components/builder-screen/matching/email-preview-dialog.tsx`

Refactor into a **two-step dialog** inside the same `Dialog` component (no DOM stacking):

| Step                | Content                                                                                                | Actions                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| **Step 1: Preview** | Current UI: preview subject + formatted body. Edit capability stays.                                   | "Close", "Copy", **"Send Email →"** (new button)               |
| **Step 2: Send**    | Form with editable `emailTo` input (pre-filled from LLM if available), read-only subject/body summary. | "← Back", **"Send Application"** (triggers PDF gen + API call) |

**PDF generation logic:** Extract from `download-pdf.tsx` into a reusable utility function:

```typescript
// utils/generate-pdf-blob.ts
export async function generatePdfBlob(resume, templateSelected, templateFormat): Promise<Blob> { ... }
```

**Loading states:** The "Send Application" button should show a spinner with text stages:

- "Generating PDF..." → "Sending Email..." → "Done ✓" or error toast.

**Success state:** Show a success message in the dialog with the Application details.

---

## 5. Code Convention Compliance

| Rule                     | How We Follow It                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------ |
| DDD structure            | New `email` module follows `application/`, `infrastructure/` pattern.                |
| Repository pattern       | `IMailProvider` injected via NestJS custom token, same as `RESUME_REPOSITORY_TOKEN`. |
| Frontend service pattern | Class-based service extending `HttpService`, using `FormData` for multipart.         |
| UI design system         | Dialog uses existing `gradient-bg`, shared components, color palette.                |
| Validation               | `class-validator` decorators on `SendEmailDto`. Joi validation for new env vars.     |

## 6. Verification Plan

### Automated

- **Backend:** Run `pnpm run build` in `rag-cv-builder` to verify TypeScript compilation.
- **Frontend:** Run `pnpm run build` in `fe` to verify Next.js build.
- **Lint:** Run `pnpm run lint:fix` in both workspaces.
- **Security:** Run `pnpm audit` in both workspaces.
- **DB:** Run `pnpm run db:generate` and `pnpm run db:migrate` to verify schema is valid.

### Manual (User Testing)

1. Open CV Builder → Match a resume with a JD that **contains an email address**.
2. Click "Generate Application Email" → Verify `emailTo` is auto-filled in the send step.
3. Click "Send Email →" → Confirm the Send step UI shows correctly.
4. Click "Send Application" → Verify loading states, success toast, and that the email arrives at the target inbox with the PDF attached.
5. Repeat with a JD that has **no email** → Verify `emailTo` is empty and the user must manually type it.
