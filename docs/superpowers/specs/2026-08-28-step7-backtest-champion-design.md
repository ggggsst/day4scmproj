# STEP 7 Backtest·Champion·Model Comparison 설계

## 목표

STEP 6의 저장 Forecast 결과와 STEP 3의 검증 Actual만 비교해 모델별 성능을 저장하고, SKU별 Champion과 전체 후보 근거를 재현 가능하게 관리한다.

## 데이터 흐름

```text
core.forecast_result + core.v_test_actual
  → core.run_backtest()
  → core.backtest_run + core.model_performance
  → core.champion_model
  → analytics views → Model Comparison
```

Backtest는 Forecast를 재실행하지 않는다. Forecast 학습 데이터와 scoring Actual을 분리하며, raw usage는 scoring 함수에서 직접 조회하지 않는다.

## 지표와 선정

Bias는 `Forecast - Actual`로 정의한다. WAPE는 `sum(abs(error))/sum(actual)`이며 actual 합계가 0이면 null이다. MAPE는 actual이 0인 기간을 제외하며 유효 분모가 없으면 null과 reason code를 저장한다. RMSE와 MAE는 유효한 paired row만 사용한다.

rank는 활성 `forecast_setting.champion_metric` 기준 오름차순으로 계산하고, 동점은 absolute Bias → RMSE → model_id 순으로 해소한다. 유효 성능이 있는 최상위 모델을 AUTO Champion으로 저장하고, 후보 전체는 JSONB로 함께 저장한다.

## 수동 지정과 권한

ADMIN만 reason 필수의 `core.set_manual_champion()`을 호출할 수 있다. 기존 Champion을 삭제하지 않고 새 이력 row를 추가하며 before/after를 `core.audit_log`에 남긴다. USER는 analytics comparison을 조회할 수 있다.
