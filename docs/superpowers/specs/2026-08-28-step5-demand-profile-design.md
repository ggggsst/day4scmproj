# STEP 5 SKU Demand Profile 설계

## 목표

활성 `core.forecast_setting`의 학습 구간에서만 SKU별 기간 Grid를 만들고, ADI·CV²·zero-demand rate·trend·최근 변화·peak·seasonality를 SQL로 계산하여 SB-C 기준 Demand Type을 제공한다.

## 데이터 흐름

```text
core.v_train_demand
  → core.v_train_period_grid
  → core.v_sku_demand_period
  → analytics.v_sku_demand_profile
  → analytics.v_demand_profile_kpi
  → /analysis/demand-profile
```

빈 기간의 수요는 Grid에서만 0으로 표현하고 원본 null은 보존한다. 모든 기간 경계는 `core.forecast_setting`에서 가져오며 raw와 `core.v_test_actual`은 사용하지 않는다.

## 계산 규칙

- ADI = 전체 학습 기간 수 / quantity > 0인 기간 수. 발생 기간이 없으면 null과 `NO_NONZERO_DEMAND`를 반환한다.
- CV = 비제로 수요의 표준편차 / 평균, CV² = CV × CV. 평균 또는 표본이 부족하면 null과 reason code를 반환한다.
- SB-C 분류는 ADI 1.32, CV² 0.49 경계만 사용한다.
- zero-demand rate는 Grid의 0 기간 비율이다.
- trend와 recent change는 학습 기간의 SQL 회귀·최근 3개 기간만 사용하며 표본 부족 시 null을 반환한다.
- peak는 수요량 내림차순, 기간 오름차순으로 동률을 가장 이른 기간으로 선택한다.
- seasonality는 학습기간 24개월 미만이면 null과 `INSUFFICIENT_PERIODS`를 반환한다.

## 보안 및 연계

화면은 analytics view만 조회한다. DB 코드값은 `SMOOTH`, `INTERMITTENT`, `ERRATIC`, `LUMPY`를 그대로 유지하여 STEP 6 `model_config.applicable_demand_type`과 연결한다. KPI의 Croston 후보는 INTERMITTENT와 LUMPY의 합으로 계산한다.
