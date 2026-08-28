# STEP 1 디자인 시스템 기반 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with review checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모든 SCM 화면이 공통 디자인 토큰, 공통 UI 컴포넌트, 역할별 메뉴 정의, route group 구조를 사용하도록 기반을 만든다.

**Architecture:** `app/globals.css`는 토큰과 reset만 담당하고 상세 스타일은 `styles/shell.css`, `styles/components.css`, `styles/chart.css`로 분리한다. 새 분석 화면은 `components/shell`, `components/ui`, `lib/menu.ts`를 사용하며 기존 workflow는 `app/(legacy)/workflow`에 격리한다.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, 순수 CSS, 기존 `lucide-react`, Node `node:test`

**Spec:** 사용자 제공 STEP 1 요구사항, `AGENTS.md`, `SCHEMA.md`

## Tasks

### Task 1: 공통 모델과 메뉴 정의

- [ ] `lib/menu.ts`에 USER/ADMIN 메뉴와 workflow 단계 타입을 정의한다.
- [ ] `lib/scm-model.ts`에 공통 상태 타입을 추가하고 기존 DB 모델은 유지한다.
- [ ] 계산 불가 표현 테스트를 추가한다.

### Task 2: CSS 파일 분리와 공통 UI

- [ ] `app/globals.css`를 토큰·기본 규칙 중심으로 정리한다.
- [ ] `styles/shell.css`, `styles/components.css`, `styles/chart.css`를 추가한다.
- [ ] shell/ui 공통 컴포넌트를 추가한다.

### Task 3: route group과 레거시 격리

- [ ] `(auth)`, `(user)`, `(admin)`, `(legacy)/workflow` 구조를 만든다.
- [ ] 기존 루트 workflow 진입점을 `(legacy)/workflow/page.tsx`로 이동한다.
- [ ] 기존 분석 라우트는 `(user)/analysis` 아래에서 같은 URL로 제공한다.

### Task 4: 분석 화면 전환

- [ ] Lead Time 화면을 공통 PageHeader/Panel/KpiCard/Badge/DataTable/EmptyValue로 전환한다.
- [ ] Stockout Risk 화면을 같은 공통 컴포넌트로 전환한다.
- [ ] 계산 로직은 `lib`와 analytics 뷰에 남긴다.

### Task 5: 검증

- [ ] 화면 컴포넌트의 hex 색상 하드코딩을 검색한다.
- [ ] `npm test`를 실행한다.
- [ ] `npm run build`를 실행한다.
- [ ] 주요 route 목록과 변경 파일을 확인한다.
