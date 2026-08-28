# STEP 5 Demand Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학습 데이터만 사용해 SKU 수요 패턴을 분류하고 analytics 화면에서 확인 가능하게 한다.

**Architecture:** SQL view가 forecast setting 기반 기간 Grid와 모든 통계를 계산한다. Next.js는 `analytics.v_sku_demand_profile`과 KPI를 조회·정규화하고, URL 필터를 화면 표시용으로만 적용한다.

**Tech Stack:** PostgreSQL/Supabase, Next.js 15, React 19, TypeScript, 순수 CSS

**Spec:** `docs/superpowers/specs/2026-08-28-step5-demand-profile-design.md`

## Global Constraints

- `core.v_train_demand` 외 raw/test 데이터를 Demand Profile 계산에 사용하지 않는다.
- 날짜와 기간 길이를 SQL/TypeScript에 하드코딩하지 않는다.
- 통계 계산은 SQL에서만 수행한다.
- 계산 불가 값은 null과 reason code로 반환한다.
- DB 코드값은 영문 표준값을 유지한다.
- UI는 analytics 결과만 조회한다.

### Task 1: SQL model and views

**Files:**
- Create: `supabase/migrations/20260828000400_create_demand_profile.sql`
- Test: `lib/demand-profile-migration.test.ts`

- [ ] Create a setting-driven period grid from `core.v_train_demand` without reading raw or test views.
- [ ] Create period-level demand and profile views with ADI, CV, CV², zero-demand rate, trend, recent change, deterministic peak, seasonality and reason code.
- [ ] Apply only SB-C thresholds and create KPI counts including Croston candidates.
- [ ] Grant authenticated read access to analytics views and keep anon blocked.
- [ ] Test leakage guards, thresholds, 24-month seasonality rule, and no fixed dates.

### Task 2: Model and repository

**Files:**
- Modify: `lib/scm-model.ts`, `lib/scm.ts`
- Test: `lib/demand-profile-model.test.ts`

- [ ] Add DemandProfile and KPI types preserving nulls and reason codes.
- [ ] Normalize database rows without calculating statistics in TypeScript.
- [ ] Add query functions with explicit `analytics` schema and error/empty distinction.

### Task 3: Screen and filters

**Files:**
- Create: `app/analysis/demand-profile/page.tsx`
- Modify: `components/analysis/analysis-tabs.tsx`, `lib/menu.ts`
- Test: `lib/demand-profile-route.test.ts`

- [ ] Render KPI cards and a reusable data table with common Badge and EmptyValue.
- [ ] Add demand type, calculability, and SKU search filters based on stored analytics rows.
- [ ] Keep filters in query parameters and never recalculate metrics in React.
- [ ] Distinguish query errors from empty results.

### Task 4: Documentation and verification

**Files:**
- Modify: `SCHEMA.md`, `아키텍처.md`

- [ ] Document the Grid/profile/KPI flow and STEP 6 model integration.
- [ ] Run `npm test` and `npm run build` on the step5 branch.
- [ ] Confirm no `raw.usage_history` or `core.v_test_actual` reference exists in profile application code.
