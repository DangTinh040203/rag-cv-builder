# Task Plan: Send Email Feature

This document tracks the step-by-step implementation of the Send Email feature. Mark tasks as `[x]` as they are completed.

---

## Phase 1: Backend — Environment & Config

- [ ] Add SMTP env keys (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`) to `Env` enum and Joi `validationSchema` in `src/libs/configs/env.config.ts`.
- [ ] Add SMTP env vars to `.env` and `.env.example`.

## Phase 2: Backend — Database Schema

- [ ] Create `Application` model in `src/libs/databases/prisma/schema/application.prisma` with fields: `id`, `resumeId`, `userId`, `emailTo`, `subject`, `body`, `status`, `appliedAt`, `createdAt`, `updatedAt`.
- [ ] Add `applications Application[]` relation to `resume.prisma`.
- [ ] Add `applications Application[]` relation to `user.prisma`.
- [ ] Run `pnpm run db:generate` to regenerate Prisma client.
- [ ] Run `pnpm run db:migrate` to apply migration.

## Phase 3: Backend — Email Module (New)

- [ ] Create module folder structure: `src/modules/email/{application/interfaces, application/services, infrastructure/providers}`.
- [ ] Define `IMailProvider` interface and `MAIL_PROVIDER_TOKEN` in `src/modules/email/application/interfaces/mail-provider.interface.ts`.
- [ ] Implement `NodemailerProvider` in `src/modules/email/infrastructure/providers/nodemailer.provider.ts`.
- [ ] Create `EmailService` in `src/modules/email/application/services/email.service.ts` that injects `IMailProvider`.
- [ ] Create `EmailModule` (`src/modules/email/email.module.ts`) registering the provider token and exporting `EmailService`.

## Phase 4: Backend — LLM Prompt & Schema Update

- [ ] Update `GENERATE_EMAIL_PROMPT` in `prompt.constant.ts` to instruct LLM to extract `emailTo` from JD.
- [ ] Update `GENERATE_EMAIL_SCHEMA` to add `emailTo` field (`Type.STRING`, `nullable: true`).
- [ ] Update `EmailGenerationService.generateEmail()` return type to include `emailTo`.

## Phase 5: Backend — API Endpoint & Application Service

- [ ] Create `SendEmailDto` in `src/modules/resume/presentation/DTOs/send-email.dto.ts` with `emailTo`, `subject`, `body`.
- [ ] Export `SendEmailDto` from `src/modules/resume/presentation/DTOs/index.ts`.
- [ ] Add `POST /resumes/:id/send-email` endpoint to `ResumeController` using `FileInterceptor('file')`.
- [ ] Implement send-email logic in `ResumeService` or a dedicated `ApplicationService`:
  - Validate resume ownership.
  - Create `Application` with status `PENDING`.
  - Call `EmailService.sendMail()` with the PDF attachment.
  - Update `Application` status to `SENT` or `FAILED`.
- [ ] Import `EmailModule` into `ResumeModule`.

## Phase 6: Frontend — Type & Service Updates

- [ ] Update `GenerateEmailResponse` in `types/resume.type.ts` to add `emailTo: string | null`.
- [ ] Add `SendEmailResponse` type in `types/resume.type.ts`.
- [ ] Add `sendEmail()` method to `ResumeService` in `services/resume.service.ts` using `FormData`.
- [ ] Extract PDF blob generation logic from `download-pdf.tsx` into a reusable utility `utils/generate-pdf-blob.ts`.

## Phase 7: Frontend — Multi-Step Email Dialog UI

- [ ] Refactor `EmailPreviewDialog` to support multi-step:
  - Step 1 (Preview): Existing preview/edit UI + new "Send Email →" button.
  - Step 2 (Send): Email form with `emailTo` input (pre-filled), subject/body summary, "Send Application" action.
- [ ] Wire up "Send Application" button:
  - Call `generatePdfBlob()` utility.
  - Call `resumeService.sendEmail()` with FormData.
  - Handle loading states: "Generating PDF..." → "Sending Email...".
  - Show success/error toast.
- [ ] Pass `emailTo` from `matchingResult` → `EmailPreviewDialog` via props.
- [ ] Ensure dialog styling matches existing `gradient-bg` design system.

## Phase 8: Final Polish & Audit

- [ ] Run `pnpm run db:generate` + `pnpm run db:migrate` one final time.
- [ ] Run `pnpm audit` in both `fe` and `rag-cv-builder`.
- [ ] Run `pnpm run lint:fix` in both workspaces.
- [ ] Run `pnpm run build` in both workspaces.
- [ ] Manual UI test: send email with JD containing an email → verify email arrival with PDF attachment.
- [ ] Manual UI test: send email with JD without email → verify user must input `emailTo` manually.
