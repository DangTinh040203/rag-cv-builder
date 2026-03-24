# Send Application Email Feature — Task Plan

## Task Breakdown

Mỗi task được chia nhỏ để có thể implement và verify từng bước. Thứ tự implement tuân theo dependency.

---

## Phase 1: Backend — Database & Core Infrastructure

### Task 1.1: Tạo Prisma Schema `Application`

- [ ] Tạo file `src/libs/databases/prisma/schema/application.prisma` với model `Application`
- [ ] Update `resume.prisma`: thêm relation `applications Application[]`
- [ ] Update `user.prisma`: thêm relation `applications Application[]`
- [ ] Chạy `npx prisma migrate dev --name add_application_table`
- [ ] Verify migration thành công, table `applications` xuất hiện trong DB

### Task 1.2: Update LLM Prompt & Schema để trích xuất email từ JD

- [ ] Update `GENERATE_EMAIL_PROMPT` trong `prompt.constant.ts`: thêm instruction extract email apply nếu JD có
- [ ] Update `GENERATE_EMAIL_SCHEMA`: thêm field `suggestedFrom` (nullable), `suggestedTo` (nullable)
- [ ] Update `email-generation.service.ts`: update return type thêm `suggestedFrom?`, `suggestedTo?`
- [ ] Test thủ công: gọi API generate-email với JD có chứa email → verify response có `suggestedTo`

### Task 1.3: Tạo Send Email Service (Resend)

- [ ] Install package `resend` nếu chưa có: `pnpm add resend`
- [ ] Thêm `RESEND_API_KEY` vào config/env validation (nếu có)
- [ ] Tạo `send-email.service.ts` trong `application/services/`
  - Inject Resend client
  - Method `sendApplicationEmail()`: gửi email qua Resend với PDF attachment + lưu DB
- [ ] Export trong `application/services/index.ts`

### Task 1.4: Tạo DTO & Repository

- [ ] Tạo `send-email.dto.ts` trong `presentation/DTOs/`
- [ ] Export trong `presentation/DTOs/index.ts`
- [ ] Tạo `prisma-application.repo.ts` trong `infrastructure/repositories/` (hoặc tái sử dụng PrismaService trực tiếp)

### Task 1.5: Tạo Controller Endpoint & Register Module

- [ ] Thêm endpoint `POST /:id/send-email` vào `resume.controller.ts`
  - Accept multipart form data (PDF file + DTO fields)
  - Throttle limit
- [ ] Register `SendEmailService` + repository trong `resume.module.ts`
- [ ] Test thủ công bằng Postman/curl: POST với form-data → verify email gửi thành công + record DB

---

## Phase 2: Frontend — PDF Generation Utility

### Task 2.1: Extract PDF generation logic thành utility

- [ ] Tạo `utils/generate-pdf-blob.ts`
  - Function `generatePdfBlob(resume, templateSelected, templateFormat): Promise<Blob>`
  - Extract logic từ `download-pdf.tsx` (phần tạo `DocumentPDF` → `pdf().toBlob()`)
- [ ] Refactor `download-pdf.tsx` để sử dụng utility mới
- [ ] Verify: Download PDF vẫn hoạt động bình thường sau refactor

---

## Phase 3: Frontend — Send Email Dialog & Integration

### Task 3.1: Update Types

- [ ] Update `GenerateEmailResponse` trong `types/resume.type.ts`: thêm `suggestedFrom?`, `suggestedTo?`
- [ ] Thêm `SendEmailPayload` interface
- [ ] Thêm `Application` interface (response từ BE)

### Task 3.2: Update Service

- [ ] Thêm method `sendEmail(resumeId, formData)` vào `services/resume.service.ts`

### Task 3.3: Tạo Send Email Dialog

- [ ] Tạo `components/builder-screen/matching/send-email-dialog.tsx`
  - Form fields: `From Email` (input), `To Email` (input)
  - Auto-fill từ `suggestedFrom` / `suggestedTo` nếu có
  - Subject + Body preview (read-only)
  - Submit button: generate PDF → create FormData → gọi `sendEmail()`
  - Loading/success/error states
  - Styles follow theme hiện tại (shadcn/ui components, CSS variables)

### Task 3.4: Integrate vào EmailPreviewDialog

- [ ] Thêm button "Send Email" vào footer `email-preview-dialog.tsx`
- [ ] Click → mở `SendEmailDialog`
- [ ] Update `matching-result.tsx`: pass thêm `resume`, template state xuống component tree
- [ ] Test end-to-end: Generate email → Click Send → Fill form → Submit → Email sent + saved

---

## Phase 4: Polish & Verification

### Task 4.1: Error Handling & UX

- [ ] Handle các case: invalid email, Resend API error, network error
- [ ] Success toast notification sau khi gửi email thành công
- [ ] Disable form khi đang submit (prevent double-submit)

### Task 4.2: Code Quality

- [ ] Chạy `pnpm lint` ở cả backend + frontend
- [ ] Review code convention theo codebase hiện tại
- [ ] Verify không có hardcoded values, tuân thủ DDD pattern

---

## Dependency Graph

```
Task 1.1 (DB Schema)
  └──> Task 1.2 (Prompt Update) — independent, can parallel
  └──> Task 1.3 (Resend Service) — needs 1.1
         └──> Task 1.4 (DTO + Repo) — needs 1.3
                └──> Task 1.5 (Controller + Module) — needs 1.3, 1.4

Task 2.1 (PDF Util) — independent of Phase 1

Task 3.1 (Types) — needs 1.2
  └──> Task 3.2 (Service method) — needs 3.1
         └──> Task 3.3 (Send Dialog) — needs 2.1, 3.2
                └──> Task 3.4 (Integration) — needs 3.3

Task 4.1, 4.2 — after all above
```

---

## Estimate

| Phase               | Tasks        | Effort         |
| ------------------- | ------------ | -------------- |
| Phase 1 — Backend   | 5 tasks      | ~2-3 hours     |
| Phase 2 — PDF Util  | 1 task       | ~30 min        |
| Phase 3 — FE Dialog | 4 tasks      | ~2-3 hours     |
| Phase 4 — Polish    | 2 tasks      | ~30 min        |
| **Total**           | **12 tasks** | **~5-7 hours** |
