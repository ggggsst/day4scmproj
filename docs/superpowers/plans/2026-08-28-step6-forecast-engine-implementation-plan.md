# STEP 6 Forecast Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학습 기간만 사용하는 SQL Baseline Forecast와 모델·실행·결과 이력을 구현한다.

**Architecture:** `core.v_train_period_grid`를 계산 입력으로 제한하고, model config/version/run/result를 core에 저장한다. 화면은 analytics view 조회만 수행하고 ADMIN 변경·실행은 서버 RPC로 보호한다.

**Tech Stack:** Next.js 15 App Router, TypeScript, PostgreSQL/Supabase, 순수 CSS, Node test runner

**Spec:** `docs/superpowers/specs/2026-08-28-step6-forecast-engine-design.md`

## Global Constraints

- Forecast 계산은 raw usage와 test actual을 직접 조회하지 않는다.
- 계산 불가는 null과 basis/reason code로 남기고 0으로 치환하지 않는다.
- 화면은 analytics view만 조회한다.
- 모델 parameters와 수요 유형은 DB에서 관리한다.
- SQL에서 이동평균, WMA, residual sigma, P80/P90을 계산한다.

### Task 1: DB 객체와 SQL 계산 함수

**Files:**
- Create: `supabase/migrations/20260828000500_create_forecast_engine.sql`
- Test: `lib/forecast-engine-migration.test.ts`

- [ ] SQL 계약 테스트 작성
- [ ] model config/version/run/result와 RLS/view를 작성
- [ ] train grid 기반 Baseline 계산 및 실패 run 처리를 작성
- [ ] SQL 정적 테스트 통과

### Task 2: 모델과 조회 계층

**Files:**
- Modify: `lib/scm-model.ts`
- Modify: `lib/scm.ts`
- Test: `lib/forecast-engine-model.test.ts`

- [ ] null 보존 타입/정규화 함수 작성
- [ ] analytics 모델·run·result 조회 함수 작성
- [ ] 정규화 테스트 통과

### Task 3: ADMIN 관리 화면

**Files:**
- Create: `app/(admin)/admin/forecast-models/page.tsx`
- Create: `app/(admin)/admin/forecast-models/actions.ts`
- Create: `app/(admin)/admin/forecast-runs/page.tsx`
- Modify: `lib/menu.ts`
- Test: `lib/forecast-engine-route.test.ts`

- [ ] requireAdmin과 RPC 기반 모델 toggle/run action 작성
- [ ] analytics view 기반 모델·실행 화면 작성
- [ ] 메뉴와 정적 route 테스트 작성

### Task 4: 문서와 검증

**Files:**
- Modify: `SCHEMA.md`
- Modify: `아키텍처.md`

- [ ] STEP 6 객체·흐름·stale·STEP 7 사용법 문서화
- [ ] `npm test`, `npm run build`, `git diff --check` 실행
