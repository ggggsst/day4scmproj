# STEP 6 Forecast Engine 설계

## 목표

STEP 3의 학습 데이터 격리 view와 STEP 5의 수요 유형 결과를 입력으로 사용해 SQL Baseline Forecast를 실행하고, 모델 정의·실행·결과를 재현 가능하게 저장한다.

## 구조

```text
core.v_train_period_grid
  → core.run_baseline_forecast()
  → core.model_version / core.forecast_run / core.forecast_result
  → analytics.v_forecast_*
  → ADMIN Forecast Models / Forecast Runs
```

Forecast 계산은 `core.v_train_period_grid`만 읽는다. 모델 parameters와 적용 수요 유형은 `core.model_config`에 저장하고, 실행 시 `core.model_version`에 JSON snapshot을 남긴다.

## 모델과 계산

등록 모델은 `MA_3M`, `MA_6M`, `WMA_3M`, `PY_SAME_MONTH`, `SEASONAL_NAIVE`다. MA는 직전 N개 기간의 평균, WMA는 DB parameters의 최근순 가중치, PY와 Seasonal Naive는 12기간 전 같은 기간 값을 사용한다. 필요한 이력이 없으면 point forecast를 null로 남긴다.

학습 기간의 과거 적합값으로 `actual - fitted` residual을 만들고 SKU·모델별 표본 표준편차를 sigma로 저장한다. P50은 point forecast, P80/P90은 model parameters의 정규분포 분위수와 sigma로 계산하며 sigma가 없으면 null이다.

## 재현성과 stale

실행은 활성 forecast setting을 snapshot하고, enabled 모델의 version·parameters·applicable demand type을 `model_version`에 복사한다. `forecast_run.data_snapshot_at`은 실행 당시 학습 원천의 loaded_at 최대값으로 저장하며, analytics run view는 현재 원천 최대값과 비교해 stale을 판정한다. 과거 run/result는 변경하거나 삭제하지 않는다.

## 권한과 화면

모델 변경과 Forecast 실행은 `core.is_admin()`을 검사하는 RPC로만 수행한다. 일반 authenticated 사용자는 analytics Forecast 결과를 조회할 수 있고, 화면은 core 테이블을 직접 조회하지 않는다. ADMIN 화면은 모델 설정과 실행 이력을 각각 표시한다.
