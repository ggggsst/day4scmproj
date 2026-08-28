# STEP 3 데이터 모델·학습 검증 격리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** STEP 4 파일 업로드 이후의 수요 분석과 Forecast Engine이 사용할 raw/core/analytics 구조를 확정하고 train/test 데이터 누수를 DB에서 차단한다.

**Architecture:** raw에는 원본과 적재 배치 메타데이터를 보존하고, core에는 운영 정책·품목 정책·forecast 기간과 학습/검증 경계 뷰를 둔다. analytics에는 기간 커버리지 확인 view를 제공하며, Next.js는 설정 조회를 통해 관리자 검증 화면을 렌더링한다. 기존 STEP 2 SSR 인증/RLS를 유지하고 `/account`는 본인 profile만 수정하도록 제한한다.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase PostgreSQL, Node test runner, 순수 CSS

**Spec:** `docs/superpowers/specs/2026-08-28-step3-data-isolation-design.md`

## Global Constraints

- `raw.usage_history`는 Forecast, Demand Profile, Backtest 학습 코드에서 직접 조회하지 않는다.
- train/test 날짜와 정책값을 SQL·TypeScript 코드에 고정하지 않고 `core.forecast_setting` 및 정책 테이블에서 읽는다.
- test Actual을 train/profile/model parameter 계산에 사용하지 않는다.
- 미래 값 보정과 null의 임의 0 치환을 하지 않는다.
- 기존 raw 테이블과 analytics view를 drop/recreate하지 않는다.
- anon 접근을 허용하지 않고, 정책 mutation은 활성 ADMIN만 수행한다.
- 특정 계정·이메일·UUID·비밀번호는 코드, migration, 테스트 fixture에 넣지 않는다.
- 기존 계산 SQL과 `components/workflow/*`는 변경하지 않는다.
- UI 문구·주석은 한국어로 작성하고 새 CSS framework는 추가하지 않는다.

### Task 1: 현재 raw/core/analytics 구조와 leakage 계약 테스트

**Files:**
- Create: `lib/forecast-isolation.test.ts`
- Modify: `SCHEMA.md`

**Interfaces:**
- Produces: migration 파일명·view 이름·필수 컬럼에 대한 실행 가능한 계약

- [ ] **Step 1: Write the failing tests**

```ts
test('STEP 3 migration exposes raw inputs, policy tables, and isolated views', () => {
  const sql = readFileSync('supabase/migrations/20260828000200_create_forecast_data_model.sql', 'utf8');
  for (const name of ['business_event', 'sales_order', 'item_substitute', 'policy_config', 'outlier_rule', 'item_policy', 'forecast_setting']) {
    assert.match(sql, new RegExp(`create table if not exists (raw|core)\\.${name}`, 'i'));
  }
  assert.match(sql, /create or replace view core\.v_train_demand/i);
  assert.match(sql, /create or replace view core\.v_test_actual/i);
  assert.match(sql, /create or replace view analytics\.v_data_coverage/i);
});

test('train view SQL reads configured train bounds and excludes test overlap', () => {
  const sql = readFileSync('supabase/migrations/20260828000200_create_forecast_data_model.sql', 'utf8');
  assert.match(sql, /forecast_setting/i);
  assert.match(sql, /train_start/i);
  assert.match(sql, /train_end/i);
  assert.match(sql, /test_start/i);
  assert.doesNotMatch(sql, /202[0-9]-[0-9]{2}-[0-9]{2}/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- lib/forecast-isolation.test.ts`
Expected: FAIL because the STEP 3 migration does not exist.

- [ ] **Step 3: Add the current schema summary to `SCHEMA.md`**

Document only the actual existing raw tables/columns discovered in `dump.sql` and the new STEP 3 object names. Do not invent Forecast source columns.

- [ ] **Step 4: Run the test and verify it still fails for the missing migration**

- [ ] **Step 5: Commit the contract documentation**

### Task 2: raw extension and core policy/forecast migration

**Files:**
- Create: `supabase/migrations/20260828000200_create_forecast_data_model.sql`
- Modify: `sql/01-grants.sql`
- Modify: `sql/02-policies.sql`

**Interfaces:**
- Produces: raw `business_event`, `sales_order`, `item_substitute`
- Produces: raw ingestion columns `batch_id`, `source_type`, `loaded_at`, `source_record_id`
- Produces: core `policy_config`, `outlier_rule`, `item_policy`, `forecast_setting`
- Produces: `core.v_train_demand`, `core.v_test_actual`, `analytics.v_data_coverage`

- [ ] **Step 1: Add raw tables with nullable source relationships and ingestion metadata**

Use UUID identity keys where no existing source key is defined, unique source record constraints only when nullable-safe, and no sample rows. Add metadata columns to existing raw input tables with `ADD COLUMN IF NOT EXISTS`; preserve existing rows.

- [ ] **Step 2: Add policy tables and a single active forecast setting**

Use typed policy fields for service level/review period/safety buffer, explicit outlier rule flags, nullable item policy values, and date/granularity checks. Enforce at most one active setting without inserting a hardcoded date or default policy value.

- [ ] **Step 3: Add train/test views**

Select normalized usage columns from `raw.usage_history` and join the active `core.forecast_setting`. Train uses `use_date >= train_start and use_date <= train_end`; test uses `use_date >= test_start and use_date <= test_end`. Add conditions preventing overlapping windows. Preserve nulls and exclude rows only by configured outlier rules.

- [ ] **Step 4: Add coverage view**

Return actual min/max date, configured boundaries, train/test row counts, window validity, and an explicit isolation flag. If settings are absent, windows overlap, or actual data does not cover the configured windows, return false rather than substituting a date or count.

- [ ] **Step 5: Add authenticated read and ADMIN mutation policies**

Revoke anon access, grant authenticated access, enable RLS on core policy tables, and use `core.is_admin()` for INSERT/UPDATE/DELETE. Preserve STEP 2 policies for app users and audit logs.

- [ ] **Step 6: Run `npm test -- lib/forecast-isolation.test.ts` and verify GREEN**

- [ ] **Step 7: Commit the database model**

### Task 3: forecast settings query and admin verification screen

**Files:**
- Modify: `lib/scm.ts`
- Modify: `lib/scm-model.ts`
- Create: `app/(admin)/admin/forecast-settings/page.tsx`
- Test: `lib/forecast-settings.test.ts`

**Interfaces:**
- Produces: typed `getForecastDataCoverage()` query against `analytics.v_data_coverage`
- Produces: typed `getForecastSettings()` query against `core.forecast_setting` and policy tables

- [ ] **Step 1: Write failing normalization tests for null/unconfigured coverage**
- [ ] **Step 2: Run focused tests and verify RED**
- [ ] **Step 3: Implement model normalization without date defaults or numeric null replacement**
- [ ] **Step 4: Implement query functions in `lib/scm.ts` using explicit schemas and error/empty distinction**
- [ ] **Step 5: Implement admin page beginning with `requireAdmin()` and render coverage, boundaries, granularity, and policies**
- [ ] **Step 6: Run focused tests and build**
- [ ] **Step 7: Commit**

### Task 4: account profile management and logout integration

**Files:**
- Create: `app/(user)/account/page.tsx`
- Create: `app/(user)/account/actions.ts`
- Modify: `lib/menu.ts`
- Test: `lib/account.test.ts`

**Interfaces:**
- Produces: authenticated `/account` page showing current email/name/department/role/status
- Produces: `updateAccountProfile(formData)` that updates only the current user's name and department
- Consumes: existing `logoutAction()` and `requireUser()`

- [ ] **Step 1: Write failing source-contract tests**

Assert that the action calls `requireUser()` before mutation, updates only `name` and `department`, never accepts role/active fields, and contains no fixed account identifiers.

- [ ] **Step 2: Run focused tests and verify RED**
- [ ] **Step 3: Add self-profile update RLS policy and server action**
- [ ] **Step 4: Add account page with logout form and existing pure CSS components**
- [ ] **Step 5: Add account menu item using `lib/menu.ts`**
- [ ] **Step 6: Run focused tests and build**
- [ ] **Step 7: Commit**

### Task 5: leakage scans, docs, and final verification

**Files:**
- Modify: `아키텍처.md`
- Modify: `error.md` only if a new execution error occurs
- Test: `lib/forecast-isolation.test.ts`, `lib/forecast-settings.test.ts`, `lib/account.test.ts`, all existing tests

- [ ] **Step 1: Scan source and SQL**

Reject direct `raw.usage_history` imports in application Forecast/Demand Profile/Backtest code, fixed dates, fixed account identifiers, null-to-zero fallback, anon writes, and non-admin policy mutation.

- [ ] **Step 2: Document the migration order and Supabase manual setup**

Include exposed schemas, migration application, first forecast setting entry by an ADMIN, and verification queries. Use placeholders only; never include a real email, UUID, password, or date.

- [ ] **Step 3: Run `npm test` and verify all tests pass**
- [ ] **Step 4: Run `npm run build` and verify exit code 0**
- [ ] **Step 5: Review `git diff --check` and changed files**
- [ ] **Step 6: Commit the final documentation and verification**
