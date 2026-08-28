# STEP 4 Import Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CSV/Excel 데이터를 staging에서 검증·승인한 뒤 batch 단위로 RAW에 안전하게 적재하고 이력·오류·rollback을 제공한다.

**Architecture:** 서버 Route Handler가 파일을 파싱하고 `core.import_staging`에 원본 행을 저장한다. 순수 `lib/import/validate.ts`가 표준 스키마와 master 데이터를 이용해 오류를 반환하며, 승인된 batch만 SECURITY DEFINER RPC를 통해 RAW에 기록한다. ADMIN은 replace와 rollback을 수행할 수 있고, 모든 작업은 `core.upload_batch`와 `core.validation_error`에 남긴다.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase PostgreSQL, Papa Parse, SheetJS (`xlsx`), 순수 CSS

**Spec:** 사용자 승인 메시지와 STEP 4 요구사항

## Global Constraints

- Tailwind, styled-components, CSS Modules를 추가하지 않는다.
- 화면에서 raw를 직접 조회하거나 validation 계산을 수행하지 않는다.
- 파일 파싱·검증은 서버에서 수행하고, 승인 전에는 raw에 쓰지 않는다.
- null, 잘못된 날짜, 잘못된 숫자를 임의 보정하지 않는다.
- 모든 import는 `batch_id`, `source_type`, `loaded_at`, `source_record_id`를 채운다.
- 특정 계정·이메일·UUID·비밀번호·운영 날짜를 하드코딩하지 않는다.
- ADMIN 권한은 서버와 DB에서 함께 검증한다.

### Task 1: Dependency and import contract

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `lib/import/types.ts`, `lib/import/schema.ts`
- Test: `lib/import-contract.test.ts`

- [ ] Add `papaparse` and `xlsx` dependencies and define import types/modes/statuses.
- [ ] Define only tables present in raw schema or STEP 3: usage_history, inventory, item_master, supplier_master, purchase_order, goods_receipt, sales_order, business_event.
- [ ] Add required fields, aliases, type hints, relation checks, and source key mapping without creating new raw columns.
- [ ] Test type/mode contracts and reject unsupported import types.

### Task 2: Server parsing and validation

**Files:**
- Create: `lib/import/parse.ts`, `lib/import/validate.ts`
- Test: `lib/import-parse.test.ts`, `lib/import-validate.test.ts`

- [ ] Parse CSV with Papa Parse and XLSX first sheet with SheetJS on the server.
- [ ] Normalize headers only for mapping; preserve original values in staging.
- [ ] Implement required, null, number, date, duplicate, master-existence, negative-value, and date-order validation.
- [ ] Return `SUCCESS`, `WARNING`, or `ERROR` with stable reason/error codes and original value; never coerce null quantity to zero.
- [ ] Make validator independent of React and repository so STEP 19 can reuse it.

### Task 3: Database staging, batch, mapping, errors, and RLS

**Files:**
- Create: `supabase/migrations/20260828000300_create_import_pipeline.sql`
- Test: `lib/import-migration.test.ts`

- [ ] Create `core.upload_batch`, `core.import_staging`, `core.column_mapping`, and `core.validation_error` with UUID batch keys and audit timestamps.
- [ ] Add RLS so active authenticated users can create/read their own staging and batch records; ADMIN can inspect all batches and mutate import state.
- [ ] Revoke anon access and keep raw inaccessible to browser roles.
- [ ] Add indexes and constraints for batch ownership, row number, error severity, and valid import mode/status.
- [ ] Add RPC signatures for approval import, rollback, and error CSV data retrieval; keep raw mutations server-side.

### Task 4: Repository and server actions

**Files:**
- Create: `lib/import/repository.ts`, `lib/import/history.ts`
- Create: `app/(admin)/admin/data-management/actions.ts`
- Test: `lib/import-repository.test.ts`

- [ ] Require an active authenticated user at every action entry; require ADMIN for replace and rollback.
- [ ] Create batch and staging rows after parsing, save confirmed column mapping, and persist validation errors.
- [ ] Block approval unless validation is complete and no ERROR rows remain.
- [ ] Implement append, upsert, and explicit-confirmation replace semantics through DB RPCs.
- [ ] Roll back only rows with the requested batch_id; expose replace rollback limitation if prior data cannot be restored.

### Task 5: Upload wizard and history UI

**Files:**
- Create: `app/(admin)/admin/data-management/page.tsx`
- Create: `components/import/import-wizard.tsx`, `components/import/import-history.tsx`, `components/import/error-download.tsx`
- Modify: `lib/menu.ts`
- Test: `lib/import-ui-contract.test.ts`

- [ ] Render file selection, import type/mode, preview, mapping confirmation, validation result, approval, history, and rollback controls.
- [ ] Disable approval/import until validation is complete and error-free.
- [ ] Show ERROR/WARNING rows and provide CSV download with original columns plus row_number/error_code/error_message/severity.
- [ ] Keep the UI as a presenter of server results; no parsing or domain validation in components.

### Task 6: Forecast stale integration and documentation

**Files:**
- Modify: `supabase/migrations/20260828000300_create_import_pipeline.sql`, `lib/import/repository.ts`
- Modify: `아키텍처.md`, `SCHEMA.md`, `error.md`
- Test: `lib/import-stale.test.ts`

- [ ] Mark demand-affecting successful batches as forecast-stale metadata without deleting forecast results.
- [ ] Provide a nullable interface for future forecast runs using `data_snapshot_at`; do not invent forecast calculations.
- [ ] Document tables, flow, validation rules, mode semantics, rollback, stale handling, and required Supabase settings.
- [ ] Document known deployment/runtime limitations in `error.md` only where applicable.

### Task 7: Verification

- [ ] Run `npm test` and confirm all tests pass.
- [ ] Run `npm run build` and confirm all routes compile.
- [ ] Verify no source file contains account credentials or fixed operational dates.
- [ ] Run SQL verification queries for tables, RLS, batch tracking, and rollback boundaries.
