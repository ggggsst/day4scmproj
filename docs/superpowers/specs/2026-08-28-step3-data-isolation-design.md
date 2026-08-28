# STEP 3 데이터 모델 확장 및 학습·검증 격리 설계

## 목표

STEP 4 파일 업로드, STEP 5 수요 패턴 분석, STEP 6 Forecast Engine이 사용할 raw/core/analytics 데이터 경계를 확정하고, 학습 데이터와 검증 Actual을 DB 뷰에서 분리해 Data Leakage를 구조적으로 차단한다.

## 확정 범위

- raw 신규 테이블: `business_event`, `sales_order`, `item_substitute`
- 기존 raw 입력 테이블에는 nullable 적재 추적 컬럼을 우선 추가한다.
- core 정책 테이블: `policy_config`, `outlier_rule`, `item_policy`, `forecast_setting`
- core 격리 뷰: `v_train_demand`, `v_test_actual`
- analytics 검증 뷰: `v_data_coverage`
- 관리자 조회 경로: `/admin/forecast-settings`
- 로그인·로그아웃은 기존 STEP 2 흐름을 유지한다.
- 로그인 후 `/account`에서 이름·부서를 조회·수정할 수 있게 확장한다.
- 비밀번호 변경은 Supabase Auth 별도 흐름으로 분리하고 이번 범위에 포함하지 않는다.

## 데이터 모델

### raw

신규 테이블은 기존 원본 테이블과 동일하게 UUID 또는 원본 식별자 기반 PK를 사용하고, 원본 간 연결은 nullable FK로 둔다. 신규 테이블에는 `batch_id`, `source_type`, `loaded_at`, `source_record_id`를 포함한다.

기존 raw 입력 테이블은 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`로 추적 컬럼을 추가한다. 기존 행을 깨뜨리지 않기 위해 `batch_id`, `source_type`, `source_record_id`는 nullable, `loaded_at`은 `timestamptz not null default now()` 또는 기존 데이터 보존을 고려한 nullable 정책 중 실제 테이블 상태에 맞춰 선택한다. raw는 적재 후 수정하지 않으며 API 역할의 직접 쓰기 권한은 부여하지 않는다.

### core 정책 및 기간

- `policy_config`: key/value 기반 운영 정책과 설명, 자료형, active 상태
- `outlier_rule`: 프로젝트성 수요·반품·중복·학습 제외 조건과 적용 여부
- `item_policy`: item_id, MOQ, pack_size, item_grade, service_level
- `forecast_setting`: 단일 활성 설정을 보장하며 `train_start`, `train_end`, `test_start`, `test_end`, `granularity`를 저장

기간·정책값은 TypeScript와 SQL 계산 코드에 날짜나 숫자로 하드코딩하지 않는다. 설정이 없거나 기간이 유효하지 않으면 coverage view에서 실패 상태로 표시한다.

## 학습·검증 격리

`core.v_train_demand`는 `core.forecast_setting`의 train 기간에 포함되는 `raw.usage_history`만 정규화해 반환한다. `core.v_test_actual`은 test 기간의 Actual만 반환한다. 두 뷰 모두 날짜 경계를 설정 테이블에서 읽고, test 기간이 train 뷰에 포함되지 않도록 명시적인 조건을 둔다.

```text
raw.usage_history → core.v_train_demand → Forecast / Demand Profile
raw.usage_history → core.v_test_actual  → Backtest scoring
```

Forecast·Demand Profile은 `v_train_demand`만 사용하고, Backtest scoring만 `v_test_actual`을 사용한다. 데이터 부족 시 미래 기간을 사용하지 않고 null과 reason code를 반환한다.

## 데이터 커버리지

`analytics.v_data_coverage`는 raw 실제 최소·최대일, 설정된 train/test 기간, 각 뷰의 row count, `train_window_ok`, `test_window_ok`, 격리 상태를 반환한다. 실제 데이터가 설정 범위를 충분히 덮지 못하거나 train/test 경계가 겹치면 false다.

## 권한과 RLS

- anon은 raw/core/analytics에 접근하지 않는다.
- authenticated 활성 사용자는 관리자 검증 view와 허용된 analytics 조회를 수행한다.
- `core.policy_config`, `core.outlier_rule`, `core.item_policy`, `core.forecast_setting` 변경은 `core.is_admin()`을 만족하는 ADMIN만 수행한다.
- 정책·설정 조회는 활성 authenticated 사용자에게 허용한다.
- 기존 STEP 2의 `app_user`, `audit_log`, role/active 보호는 유지한다.

## 계정 관리

`/account`는 `requireUser()`로 보호하고 현재 로그인한 `auth.uid()`의 `core.app_user` 행만 조회한다. 이름·부서 변경 action은 서버에서 현재 사용자와 대상 ID가 일치하는지 확인하고, role·active 변경은 허용하지 않는다. 로그아웃은 기존 `logoutAction`을 재사용한다. 특정 계정, 이메일, UUID, 비밀번호는 코드에 넣지 않는다.

## 기존 데이터 보호

기존 raw 테이블과 analytics view는 drop/recreate하지 않는다. migration은 `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, 신규 view/function 생성 방식으로 작성하고 기존 컬럼명은 `SCHEMA.md`의 실제 명칭을 우선한다.

## 검증 기준

- 신규 raw 테이블과 적재 추적 컬럼 존재
- 정책·forecast 설정이 core에서 조회됨
- train 뷰에 test 기간 row가 없음
- test 뷰에 test 기간 외 row가 없음
- Forecast 관련 코드가 raw.usage_history를 직접 조회하지 않음
- coverage view가 기간 이상을 false로 표시
- 정책 mutation이 USER/anon에서 거부됨
- `/admin/forecast-settings`는 ADMIN만 접근
- `/account`는 본인 profile만 수정
- 특정 계정·날짜·정책값 하드코딩 없음
- `npm test`, `npm run build` 성공
