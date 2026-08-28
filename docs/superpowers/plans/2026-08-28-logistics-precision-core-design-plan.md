# Logistics Precision Core 디자인 전환 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans 또는 superpowers:subagent-driven-development to implement this plan task-by-task with review checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 월간 발주계획 MVP의 시각 체계를 `C:\Users\kimta\Downloads\DESIGN.md`의 Logistics Precision Core 디자인 방향으로 전환한다.

**Architecture:** 데이터 모델과 Supabase 조회 계층은 유지하고, 전역 CSS 토큰·앱 셸·분석 셸·공통 컴포넌트 스타일을 중심으로 단계적으로 교체한다. 화면별 업무 로직은 유지하며 공통 UI를 먼저 바꾼 뒤 업무 화면과 분석 화면의 세부 스타일을 맞춘다.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, 순수 CSS, 기존 `lucide-react`

**Spec:** `C:\Users\kimta\Downloads\DESIGN.md`, `AGENTS.md`, `SCHEMA.md`

## 지시사항 우선순위와 해석

`DESIGN.md`는 사용자가 제공한 시각 디자인 참고 문서다. 색상, 타이포그래피, 간격, 레이아웃, 컴포넌트 표현은 반영 대상이지만 프로젝트 실행 규칙은 아니다. 다음 기존 규칙을 우선한다.

- 새 CSS 프레임워크·CSS Module·styled-components를 추가하지 않는다.
- 계산식과 데이터 정제는 화면이 아니라 `lib`와 `analytics` 계층에 둔다.
- 화면 문구와 주석은 한국어로 작성한다.
- 차트 라이브러리는 추가하지 않는다. 스파크라인이 필요하면 순수 CSS 또는 접근 가능한 인라인 SVG를 검토한다.

## 검토 결과

### 구현 가능성

구현 가능성은 높다. 현재 UI가 전역 CSS 클래스(`sidebar`, `card`, `grid`, `analysis-table` 등)를 중심으로 구성되어 있어 디자인 토큰과 공통 스타일을 교체하면 대부분의 화면에 일괄 적용할 수 있다. 별도 UI 프레임워크나 데이터 계층 변경은 필요하지 않다.

### 현재와 디자인의 주요 차이

| 영역 | 현재 구현 | 디자인 목표 | 영향 |
|---|---|---|---|
| 색상 | 네이비·블루 중심, 녹색/호박색 상태색 | `#1E293B` primary, `#F97316` alert, `#14B8A6` positive, `#F8FAFC` surface | 전역 토큰과 상태 클래스 조정 |
| 글꼴 | Noto Sans KR | Inter + JetBrains Mono | 한글 fallback과 데이터 전용 폰트 적용 필요 |
| 사이드바 | 250px, 기존 업무 플로우 중심 | 240px persistent sidebar | 앱 셸 스타일 조정 |
| 그리드 | 2·3·4열 유틸리티 | 12열 fluid grid, 최대 1440px | 공통 grid 확장 및 화면별 span 지정 |
| 카드/버튼 | 9~14px radius, 파란 primary | 기본 4px, 큰 컨테이너 8px, CTA 주황색 | radius·shadow·버튼 토큰 조정 |
| 표 | 일반 표, 분석 표 분리 | 40/48px 행, sticky header, 정렬 affordance | `DataTable` 확장 필요 |
| 모바일 | 표를 가로 스크롤 | 복잡한 표를 확장형 카드로 전환 | 별도 모바일 표현 설계 필요 |
| 예측 표시 | 없음 | 행 내부 sparkline 권장 | 데이터 컬럼·시각화 범위 확정 필요 |

### 주요 위험

- Inter와 JetBrains Mono를 외부 Google Fonts에 의존하면 네트워크 차단 환경에서 fallback으로 표시될 수 있다. 1차 구현은 기존 외부 폰트 방식과 시스템 fallback을 유지하고, 운영 전 self-hosting 여부를 결정한다.
- `DESIGN.md`의 12열·모바일 확장 카드·sparkline은 단순 색상 변경보다 컴포넌트 구조 변경이 필요하다. 1차 전환에서 모두 한 번에 구현하지 않고 단계별로 적용한다.
- 현재 `superSCM/` 중복 디렉터리가 있으므로 정식 루트만 수정한다. 중복 디렉터리를 동시에 바꾸지 않는다.

## 구현 단계

### Task 1: 디자인 토큰과 타이포그래피

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx` (외부 폰트 로딩 방식을 바꿀 때만)

- [ ] DESIGN 색상 토큰을 CSS 변수로 정의한다.
- [ ] surface, outline, primary, secondary, tertiary, error 계층을 상태 의미와 함께 매핑한다.
- [ ] Inter를 일반 텍스트, JetBrains Mono를 코드·수치·식별자에 적용할 수 있는 클래스를 만든다.
- [ ] 8px spacing rhythm과 4px 기본 radius를 공통 토큰으로 만든다.

### Task 2: 앱 셸과 분석 셸

**Files:**
- Modify: `app/globals.css`
- Modify: `components/procurement-app.tsx`
- Modify: `app/analysis/layout.tsx`

- [ ] 사이드바를 240px 기준으로 조정한다.
- [ ] 발주계획 메뉴와 분석 메뉴의 시각 계층을 분리한다.
- [ ] 상단바, 분석 탭, 본문 최대 폭을 1440px 기준으로 맞춘다.
- [ ] active, hover, focus-visible 상태를 키보드 접근 가능하게 유지한다.

### Task 3: 카드·버튼·상태 배지 공통 스타일

**Files:**
- Modify: `app/globals.css`
- Review: `components/workflow/*.tsx`, `components/analysis/*.tsx`

- [ ] 카드 shadow를 단일 ambient shadow로 통일한다.
- [ ] 기본 버튼은 primary/secondary/ghost 의미로 분리하고, 긴급 CTA에만 주황색을 사용한다.
- [ ] SAFE/완료는 teal, CRITICAL/지연은 orange 또는 error, UNKNOWN은 neutral로 일관되게 표시한다.
- [ ] 기존 화면의 인라인 스타일은 공통 클래스가 대체 가능한 범위에서 정리한다.

### Task 4: 데이터 표와 분석 화면

**Files:**
- Modify: `components/analysis/data-table.tsx`
- Modify: `app/analysis/leadtime/page.tsx`
- Modify: `app/analysis/stockout/page.tsx`
- Modify: `app/globals.css`

- [ ] 표 헤더를 sticky 처리하고 표 행 높이를 화면 밀도에 맞춘다.
- [ ] 숫자·품목 코드·공급처 코드는 tabular/monospace 표현을 적용한다.
- [ ] 기존 `Column<T>` API를 깨지 않고 정렬 표시를 확장할지 검토한다.
- [ ] `null`, `NO_USAGE`, `NO_LEADTIME` 상태는 디자인의 neutral/error 표현으로 유지한다.
- [ ] sparkline은 실제 시계열 데이터가 제공될 때만 추가하며, 임의의 값을 생성하지 않는다.

### Task 5: 반응형과 접근성

**Files:**
- Modify: `app/globals.css`
- Review: `components/procurement-app.tsx`, `components/analysis/data-table.tsx`

- [ ] 데스크톱은 12열, 모바일은 1열로 전환한다.
- [ ] 넓은 표는 가로 스크롤을 유지할지 확장형 카드로 바꿀지 화면별로 결정한다.
- [ ] 색상만으로 상태를 구분하지 않고 텍스트 배지를 함께 제공한다.
- [ ] 링크·버튼의 focus-visible, 대비, 표의 읽기 순서를 확인한다.

### Task 6: 검증과 시각 QA

**Files:**
- No required source changes

- [ ] `npm test`를 실행한다.
- [ ] `npm run build`를 실행한다.
- [ ] `/`, `/analysis/leadtime`, `/analysis/stockout`을 데스크톱·모바일 폭에서 확인한다.
- [ ] Supabase 오류·빈 결과·UNKNOWN 상태가 디자인 변경 후에도 구분되는지 확인한다.
- [ ] 대표 화면 캡처를 기준으로 spacing, overflow, contrast, active state를 점검한다.

## 완료 기준

- 기존 업무 플로우와 두 분석 라우트의 데이터·이동 기능이 유지된다.
- 화면 전체가 DESIGN의 primary/alert/positive 색상 의미, 8px spacing, 카드·표·버튼 형태를 일관되게 사용한다.
- 데이터 계산 로직과 Supabase 스키마는 변경하지 않는다.
- 모바일에서 핵심 KPI와 위험 상태를 읽을 수 있다.
- `npm test`와 `npm run build`가 통과한다.

## 범위에서 제외하는 항목

- 로그인·권한·DB 스키마 변경
- 실제 발주 전송 및 외부 ERP/SFDC 연계
- 새 차트 라이브러리 도입
- 데이터가 없는 sparkline을 임의 샘플값으로 채우는 작업
