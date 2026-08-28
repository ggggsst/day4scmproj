# STEP 7 Backtest Champion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 저장된 Forecast 결과를 검증 Actual과 비교해 성능·순위·Champion을 DB에 저장한다.

**Architecture:** Backtest RPC는 `forecast_result`와 `v_test_actual`만 조인해 SQL 지표를 계산하고, analytics view와 공통 차트 wrapper가 저장 결과를 렌더링한다. ADMIN mutation은 서버 helper와 DB RLS/RPC로 보호한다.

**Tech Stack:** Next.js 15, TypeScript, PostgreSQL/Supabase, 순수 CSS, Node test runner

**Spec:** `docs/superpowers/specs/2026-08-28-step7-backtest-champion-design.md`

## Global Constraints

- Backtest 화면에서 Forecast를 재실행하지 않는다.
- scoring 함수에서 raw usage를 직접 조회하지 않는다.
- React에서 WAPE/MAPE/Bias/RMSE/MAE를 계산하지 않는다.
- 계산 불가 지표는 null과 reason code로 남긴다.

### Task 1: Backtest DB 객체와 scoring RPC

**Files:**
- Create: `supabase/migrations/20260828000600_create_backtest_champion.sql`
- Test: `lib/backtest-migration.test.ts`

- [ ] core run/performance/champion 테이블과 analytics view 작성
- [ ] WAPE/MAPE/Bias/RMSE/MAE, rank, improvement 계산 작성
- [ ] AUTO/MANUAL champion RPC와 audit log 연결 작성
- [ ] scoring은 stored forecast와 test view만 사용하도록 계약 테스트 작성

### Task 2: 타입·조회·내보내기 데이터

**Files:**
- Modify: `lib/scm-model.ts`
- Modify: `lib/scm.ts`
- Test: `lib/backtest-model.test.ts`

- [ ] performance/champion/comparison 타입과 null-preserving normalizer 작성
- [ ] analytics run/performance/champion 조회 함수 작성

### Task 3: 비교 화면과 차트 wrapper

**Files:**
- Create: `components/chart/forecast-overlay-chart.tsx`
- Create: `app/analysis/model-comparison/page.tsx`
- Modify: `lib/menu.ts`
- Test: `lib/backtest-route.test.ts`

- [ ] 저장된 결과 기반 필터와 모델 toggle 작성
- [ ] Actual/P50/P80/P90을 표시하는 공통 SVG wrapper 작성
- [ ] CSV export route 또는 서버 생성 기능 작성

### Task 4: ADMIN 화면·문서·검증

**Files:**
- Create: `app/(admin)/admin/backtest/page.tsx`
- Create: `app/(admin)/admin/backtest/actions.ts`
- Modify: `SCHEMA.md`
- Modify: `아키텍처.md`

- [ ] ADMIN Backtest 실행과 수동 Champion action 작성
- [ ] 실행 이력·선정 근거 표시
- [ ] STEP 7 구조와 STEP 10 재사용 지점 문서화
- [ ] `npm test`, `npm run build`, `git diff --check` 실행
