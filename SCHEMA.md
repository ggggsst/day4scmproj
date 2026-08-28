# 4회차 Supabase 구조

> Codex 에게 기능을 시킬 때 이 파일을 먼저 읽으라고 하세요.
> 이 문서가 없으면 Codex 는 존재하지 않는 테이블과 컬럼을 지어냅니다.

## 스키마 역할

| 스키마 | 역할 |
|---|---|
| `raw` | CSV 원본. 적재 후 수정하지 않습니다 |
| `core` | 공급처 표기 매핑과 수업 중 확정하는 기준 |
| `analytics` | 화면과 AI 가 조회하는 뷰 |

**화면 코드에서 `raw` 를 직접 조회하지 마세요.** 정제 규칙이 화면마다 흩어지면 같은 지표가 화면마다 다른 숫자로 나옵니다.

## 수업 전 확인 건수

| 대상 | 기대값 |
|---|---:|
| `raw.shipment_log` | 2,864 |
| `raw.usage_history` | 7,038 |
| `raw.inventory` | 43 |
| `raw.item_master` | 23 |
| `raw.supplier_master` | 13 |
| `raw.purchase_order` | 92 |
| `raw.goods_receipt` | 81 |
| `core.supplier_alias` | 36 |
| `core.leadtime_plan` | **0** |
| `core.usage_profile` | **0** |
| `analytics.v_stockout_risk` | 20 |

`core.leadtime_plan` 과 `core.usage_profile` 은 오전 분석 후 참가자와 확정합니다. 수업 전에는 비어 있어야 합니다.

---

## analytics — 화면이 조회하는 뷰

### `v_leadtime_gap`
공급처별 마스터 리드타임과 실제 P80 비교. 12행.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| supplier_id | text | SUP001 ~ SUP013 |
| supplier_name | text | Fujifilm BI Japan 등 |
| country | text | Japan, China, India … |
| std_lead_time | int | 마스터 표준 리드타임(일) |
| n_samples | int | 실적 표본 수 |
| avg_order_to_ship | numeric | 발주 → 현지 출고 평균(일) |
| avg_ship_to_receive | numeric | 출고 → 검수완료 평균(일) |
| mean_days | numeric | 전체 평균(일) |
| p50_days / p80_days / p90_days | int | 분위수 |
| std_days | numeric | 표준편차 |
| gap_days | int | p80_days − std_lead_time. 양수면 실제가 더 김 |
| confidence | text | HIGH / MEDIUM / LOW (표본 수 기준) |

### `v_stockout_risk`
재고 소진 위험. 20행. **오후 실습의 검증 정답지입니다.**

| 컬럼 | 타입 | 설명 |
|---|---|---|
| item_id | text | ITEM001 ~ ITEM020 |
| item_name | text | 품목명 |
| supplier_id | text | 생산법인 |
| current_stock | numeric | 현재고 (창고 합산) |
| inbound_qty | numeric | 입고예정 (진행 중 선적) |
| available_qty | numeric | current_stock + inbound_qty |
| daily_usage_avg | numeric | 일평균 사용량 (없으면 null) |
| cv | numeric | 변동계수 |
| planned_lead_time | int | 적용 중인 계획 리드타임 |
| stockout_days | numeric | available_qty ÷ daily_usage_avg (계산 불가 시 null) |
| stockout_date | date | 소진 예상일 |
| risk_status | text | SAFE / CRITICAL / UNKNOWN |
| reason | text | NO_USAGE / NO_LEADTIME (정상이면 null) |

### `v_stockout_kpi`
요약 한 줄.
`n_items`, `n_critical`, `n_safe`, `n_unknown`, `n_within_30d`, `avg_stockout_days`

### `v_usage_profile`
자재별 사용 프로파일. 19행.
`item_id`, `item_name`, `item_type`, `supplier_id`, `valid_days`,
`daily_usage_avg`, `daily_usage_sd`, `cv`, `stability`, `source`

### `v_usage_anomaly`
이상 사용 이력. 39행.
`usage_id`, `item_id`, `use_date`, `qty`, `avg_qty`, `ratio`, `note`,
`anomaly_type` (RETURN / PROJECT / UNEXPLAINED)

---

## core — 정제와 계산

### `leadtime_plan` (테이블 · 쓰기 가능)
오전 분석에서 확정한 계획 리드타임.
`supplier_id`(PK), `planned_lead_time`, `basis`, `service_level`, `confirmed_reason`, `confirmed_at`

**이 값을 바꾸면 `v_stockout_risk` 의 판정이 즉시 달라집니다.** 화면 코드는 한 줄도 고치지 않습니다.

### `usage_profile` (테이블 · 쓰기 가능)
오전 분석에서 확정한 일평균 사용량.
`item_id`(PK), `valid_days`, `daily_usage_avg`, `daily_usage_sd`, `cv`, `confirmed_at`

### 그 밖의 core 뷰

```
v_fact_shipment          정제 + 구간 일수 + 품질 판정
v_shipment_valid         분석 가능한 완료 건만
v_leadtime_stat          공급처별 분위수
v_leadtime_effective     확정값 → 없으면 실적 P80
v_usage_effective        확정값 → 없으면 정제 기준 평균
v_item_master            품목코드 정규화 · 중복 제거
v_stock_on_hand          창고 표기 통일 후 현재고 합산
v_inbound_qty            진행 중 선적 = 입고예정
```

---

## raw — 원본 (직접 조회하지 않음)

| 테이블 | 행수 | 비고 |
|---|---|---|
| shipment_log | 2,864 | 타임스탬프 7개. 진행 중 117건 포함 |
| usage_history | 7,038 | 영업일 385일. 음수(반품) 16건 포함 |
| supplier_master | 13 | 법인 12곳 + 중복 등록 1건 |
| item_master | 23 | 품목 20개 + 표기 오염 2 + 단종 1 |
| purchase_order | 92 | 공급업체 표기 25종 |
| goods_receipt | 81 | |
| inventory | 43 | 창고 표기 흔들림 있음 |

`shipment_log` 타임스탬프 순서:

```
order_date → supplier_ship_date → port_departure_date → port_arrival_date
→ customs_clear_date → warehouse_receipt_date → qc_release_date
```

**리드타임의 끝점은 `qc_release_date`** 입니다. 창고에 도착해도 검수 전이면 쓸 수 없습니다.

---

## 접속 방법

```ts
import { createSupabaseServerClient } from '@/lib/supabase';

const supabase = await createSupabaseServerClient();
const { data, error } = await supabase
  .schema('analytics')
  .from('v_stockout_risk')
  .select('*');
```

`public` 스키마가 아니므로 `.schema()` 를 반드시 거쳐야 합니다.

**Supabase 대시보드에서 스키마 노출 설정이 되어 있어야 합니다.**

```
Project Settings → API → Data API → Exposed schemas
    public, core, analytics
```

이 설정이 없으면 조회 결과가 **에러 없이 빈 배열**로 나옵니다.

조회 함수는 `lib/scm.ts` 에 모읍니다. 화면에서 supabase 를 직접 부르지 않습니다.

## STEP 4 Import Pipeline

관리자 데이터 관리는 `/admin/data-management`에서 수행한다. 파일은 서버에서 CSV/XLSX로 파싱한 후 `core.import_staging`에 보관하고, `core.validation_error`에 행별 결과를 저장한다. 사용자가 승인한 오류 없는 batch만 `core.import_batch` RPC를 통해 raw에 기록한다.

| 객체 | 역할 |
|---|---|
| `core.upload_batch` | 파일명, 타입, mode, 행 수, 상태, 업로드 사용자와 stale 상태 |
| `core.import_staging` | 승인 전 원본 행과 매핑 행 |
| `core.column_mapping` | 파일 컬럼과 표준 컬럼의 재사용 매핑 |
| `core.validation_error` | ERROR/WARNING 행의 코드·메시지·원본값 |
| `core.v_supplier_master` | import 검증용 공급처 master view |
| `core.import_batch()` | 검증 완료 batch의 RAW 적재 |
| `core.rollback_batch()` | 동일 batch_id의 RAW 행만 rollback |

`append`는 새 행을 추가하고, `upsert`는 source key 기반 import 계약으로 전달된다. `replace`와 rollback은 ADMIN 전용이며 replace batch는 기존 데이터의 완전 복구를 보장하지 않아 rollback이 제한된다. raw schema는 브라우저 역할에 노출하지 않는다.

## STEP 3 확장 객체

### raw 입력 테이블

`business_event`, `sales_order`, `item_substitute`가 파일/API 적재 확장용으로 추가된다. 기존 raw 입력 테이블에는 `batch_id`, `source_type`, `loaded_at`, `source_record_id` 추적 컬럼을 nullable/default 방식으로 확장한다. raw는 애플리케이션에서 직접 읽거나 수정하지 않는다.

### core 기준·설정 테이블

| 객체 | 역할 |
|---|---|
| `policy_config` | service level, review period, safety buffer 등 운영 정책값 |
| `outlier_rule` | 프로젝트성 수요, 반품, 중복 등 학습 제외 규칙 |
| `item_policy` | 품목별 MOQ, pack size, grade, service level |
| `forecast_setting` | train/test 날짜 경계와 DAY/WEEK/MONTH granularity |

### 학습/검증 view

`core.v_train_demand`는 활성 forecast setting의 train 기간만, `core.v_test_actual`은 test 기간 Actual만 반환한다. `analytics.v_data_coverage`는 전체 원본 기간과 train/test 기간의 충족·격리 상태를 점검한다. Forecast와 Demand Profile은 train view를, Backtest scoring은 test view를 사용해야 하며 코드에 날짜를 고정하지 않는다.

관리자 검증 화면은 `/admin/forecast-settings`이며, 개인 계정 관리·로그아웃 화면은 `/account`이다.
## STEP 5 SKU Demand Profile

`supabase/migrations/20260828000400_create_demand_profile.sql`은 활성 `core.forecast_setting`의 학습 경계를 기준으로 기간 Grid를 생성한다. `core.v_train_period_grid`가 빈 기간을 명시적으로 0으로 만들고 원본 행 존재 여부를 `source_row_count`, `is_grid_zero`로 구분한다. `core.v_sku_demand_period`는 SKU별 기간 순번을 추가한다.

`analytics.v_sku_demand_profile`은 ADI, CV, CV², 무수요율, 추세, 최근 3기간 변화율, 최조 기간 기준의 peak, 수요 유형, 계절성 판정 가능 여부를 SQL로 계산한다. 수요 유형은 `SMOOTH`, `INTERMITTENT`, `ERRATIC`, `LUMPY` 코드만 사용한다. 24기간 미만의 계절성은 `null + INSUFFICIENT_PERIODS`로 반환한다. `analytics.v_demand_profile_kpi`는 유형별 SKU 수와 Croston 후보 수를 제공한다.

화면 `/analysis/demand-profile`은 `lib/scm.ts`에서 analytics view를 조회하고 `EmptyValue`와 공통 `Badge`를 사용한다. 필터는 저장된 결과의 표시 범위만 줄이며 React에서 ADI·CV·추세를 재계산하지 않는다.
## STEP 6 Forecast Engine

`supabase/migrations/20260828000500_create_forecast_engine.sql`은 `core.v_train_period_grid`만 Forecast 계산 입력으로 사용한다. `core.model_config`에는 `MA_3M`, `MA_6M`, `WMA_3M`, `PY_SAME_MONTH`, `SEASONAL_NAIVE`와 parameters·적용 수요 유형이 저장된다. parameters를 변경해도 애플리케이션 코드를 수정할 필요가 없다.

`core.run_baseline_forecast()`는 ADMIN만 실행할 수 있으며 활성 setting과 enabled 모델을 읽고, `core.model_version`에 모델 정의 snapshot을 저장한 뒤 `core.forecast_run`을 RUNNING으로 만들고 `core.forecast_result`를 적재한다. 정상 실행은 SUCCESS, 예외는 FAILED와 message로 남긴다. 결과의 `basis`가 `INSUFFICIENT_HISTORY`이면 point와 interval을 null로 유지한다.

화면은 `/admin/forecast-models`와 `/admin/forecast-runs`이며 core 테이블을 직접 읽지 않고 `analytics.v_model_config`, `v_forecast_run`, `v_forecast_result`, `v_forecast_run_kpi`를 조회한다. `analytics.v_forecast_run.is_stale`는 현재 원천 loaded_at 최대값이 실행 snapshot보다 큰지로 판정한다. STEP 7은 `run_id`를 기준으로 저장된 모델별 결과를 비교·선택하며 화면에서 Forecast를 재실행하지 않는다.
