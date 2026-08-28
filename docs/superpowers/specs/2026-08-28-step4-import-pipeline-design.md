# STEP 4 데이터 적재 파이프라인 설계

## 목표

CSV와 XLSX를 서버에서 파싱·검증하고, 사용자가 결과를 확인한 뒤 승인된 행만 RAW에 batch 단위로 적재한다. 모든 오류와 작업 이력을 보존하고, batch별 rollback으로 동일 batch의 데이터만 되돌린다.

## 데이터 흐름

```text
파일 → 서버 parser → core.import_staging
                  → lib/import/validate.ts
                  → core.validation_error
                  → 사용자 승인
                  → import RPC
                  → raw 테이블
                  → core.upload_batch / stale marker
```

승인 전에는 raw를 변경하지 않는다. 원본 값은 staging에 보존하고, 매핑된 표준 행은 별도 JSON 구조로 저장한다.

## 지원 범위

현재 확인된 raw 입력과 STEP 3 테이블만 지원한다: usage_history, inventory, item_master, supplier_master, purchase_order, goods_receipt, sales_order, business_event. 파일별 컬럼 alias는 `lib/import/schema.ts`에서 관리하고 사용자가 최종 확인한다.

## 검증과 모드

검증기는 필수 컬럼·필수값·숫자·날짜·중복·master 존재·음수·날짜 관계를 검사한다. 실패한 값은 수정하지 않고 원본 값, 코드, 메시지, severity를 저장한다. ERROR가 남은 batch는 승인할 수 없다.

append는 새 행을 추가하고, upsert는 표준 source key 기준으로 기존 행을 갱신하거나 추가한다. replace는 ADMIN과 명시적 확인이 필요한 위험 작업이며, rollback은 새 batch로 생성된 행만 되돌린다.

## 보안

모든 Server Action/Route Handler는 `requireUser()`를 먼저 호출한다. replace와 rollback은 `requireAdmin()`을 사용한다. raw는 authenticated 브라우저 역할에 직접 노출하지 않고, 서버 전용 DB RPC가 batch_id와 권한을 검증한다. 계정·secret key·운영값은 소스에 넣지 않는다.

## Forecast stale

usage_history, sales_order, business_event처럼 수요에 영향을 주는 성공 batch는 stale 표시를 남긴다. 기존 Forecast 결과는 삭제하지 않으며, 현재 저장소에 Forecast Run 구현이 없으므로 연결 가능한 snapshot/stale metadata만 제공한다.
