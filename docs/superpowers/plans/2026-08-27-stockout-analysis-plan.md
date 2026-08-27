# 재고 소진 위험 분석 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline execution) to implement this plan task-by-task with review checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `analytics.v_stockout_risk`와 `analytics.v_stockout_kpi`를 조회해 재고 소진 위험 분석 화면과 분석 메뉴를 제공한다.

**Architecture:** DB 뷰가 계산한 값을 `lib/scm-model.ts`에서 화면 모델로 정규화하고, `lib/scm.ts`가 조회한다. `/analysis/stockout`은 기존 `AnalysisFrame`과 `DataTable`을 재사용하며, 공통 분석 레이아웃과 탭은 `app/analysis/layout.tsx`와 `components/analysis/analysis-tabs.tsx`에서 관리한다.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase PostgreSQL, 순수 CSS, Node `node:test`

**Spec:** 대화에서 승인된 소진 위험 분석 설계 및 `SCHEMA.md`

## Global Constraints

- 화면은 `raw`를 직접 조회하지 않고 `analytics` 뷰를 조회한다.
- 숫자 계산은 SQL 뷰가 담당하고 화면은 계산 결과를 표시한다.
- 계산 불가 값은 `null`과 `NO_USAGE`·`NO_LEADTIME` 사유로 표현한다.
- 새 CSS 프레임워크를 추가하지 않고 `app/globals.css`를 사용한다.
- 화면 문구와 주석은 한국어로 작성한다.

---

### Task 1: 소진 위험 모델과 정규화

**Files:**
- Modify: `lib/scm-model.ts`
- Test: `lib/scm-model.test.ts`

- [ ] 소진 위험 및 KPI 정규화 테스트를 먼저 작성한다.
- [ ] 테스트가 정규화 함수 부재로 실패하는지 확인한다.
- [ ] `StockoutRisk`, `StockoutKpi`, 정규화 함수를 추가한다.
- [ ] 테스트가 통과하는지 확인한다.

### Task 2: Supabase 조회 계층

**Files:**
- Modify: `lib/scm.ts`

- [ ] `analytics.v_stockout_risk` 목록 조회 함수 `getStockoutRisk()`를 추가한다.
- [ ] 기존 `getStockoutKpi()`가 정규화된 KPI를 반환하도록 연결한다.

### Task 3: 소진 위험 분석 화면

**Files:**
- Create: `app/analysis/stockout/page.tsx`

- [ ] KPI 카드와 품목별 위험 표를 구성한다.
- [ ] `CRITICAL`, `SAFE`, `UNKNOWN`을 상태 배지로 표시한다.
- [ ] `NO_USAGE`, `NO_LEADTIME` 및 null 값을 숫자로 대체하지 않는다.
- [ ] 조회 오류와 빈 결과를 구분한다.

### Task 4: 분석 공통 레이아웃과 메뉴

**Files:**
- Create: `app/analysis/layout.tsx`
- Create: `components/analysis/analysis-tabs.tsx`
- Modify: `components/procurement-app.tsx`
- Modify: `app/globals.css`

- [ ] 분석 공통 레이아웃에 루트 이동 링크와 분석 탭을 추가한다.
- [ ] 루트 사이드바 하단에 리드타임·소진 위험 메뉴를 표시한다.
- [ ] 기존 순수 CSS 스타일 체계를 유지한다.

### Task 5: 검증

**Files:**
- No source changes

- [ ] `npm test`를 실행한다.
- [ ] `npm run build`를 실행하고, 기존 미추적 `superSCM/` 복사본 오류와 기능 오류를 구분한다.
- [ ] 변경 파일과 상태를 확인한다.
