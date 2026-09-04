# `core.app_user` relation does not exist

## 증상

Supabase SQL Editor에서 다음 오류가 발생한다.

```text
ERROR: 42P01: relation "core.app_user" does not exist
```

## 원인

저장소의 `supabase/migrations/20260828000100_create_auth_rbac.sql` 파일은 원격 Supabase 데이터베이스에 자동으로 적용되지 않는다. migration이 아직 실행되지 않았거나, SQL에 `core.app\\_user`처럼 백슬래시가 실제로 포함된 경우 발생한다.

## 해결 방법

1. Supabase Dashboard에서 프로젝트를 선택한다.
2. SQL Editor에서 `supabase/migrations/20260828000100_create_auth_rbac.sql`의 전체 내용을 실행한다.
3. 실행 후 테이블을 확인한다.

```sql
select to_regclass('core.app_user');
```

결과가 `core.app_user`이면 정상이다. 결과가 `null`이면 migration이 실행되지 않은 것이다.

4. SQL Editor에 최초 ADMIN 승격 SQL을 실행할 때는 백슬래시 없이 입력한다.

```sql
update core.app_user
set role = 'ADMIN'
where user_id = '<실제 가입자 UUID>';
```

`<실제 가입자 UUID>`는 Supabase Authentication의 실제 가입자 UUID로 교체한다. 특정 이메일·UUID·비밀번호를 소스 코드에 저장하지 않는다.

## 추가 확인

```sql
select user_id, email, role, active
from core.app_user
order by created_at;
```

auth 사용자를 먼저 생성해야 trigger가 `core.app_user` 행을 자동 생성한다. 기존 auth 사용자가 trigger 생성 이전에 만들어졌다면 profile 행이 없을 수 있으므로, 운영 정책을 확인한 후 실제 UUID를 사용해 별도 profile 보정 절차를 진행한다.

# TypeScript TS1501 정규식 플래그 오류

## 증상

`npx tsc --noEmit` 실행 시 `/.../is` 정규식에 대해 다음 오류가 발생한다.

```text
TS1501: This regular expression flag is only available when targeting 'es2018' or later.
```

## 원인

`tsconfig.json`의 `target`이 `es5`여서 ES2018에서 지원되는 정규식 `s` 플래그를 사용할 수 없다.

## 해결 방법

`tsconfig.json`의 컴파일 목표를 `es2018` 이상으로 설정한다.

```json
{
  "compilerOptions": {
    "target": "es2018"
  }
}
```

정규식의 `is` 플래그를 제거하거나 테스트를 수정할 필요는 없다.

## Next 빌드에서 계속 발생하는 경우

Next.js의 프로덕션 타입 검사 대상에서 테스트 파일을 제외한다. 테스트는 `npm test`에서 별도로 실행한다.

```json
{
  "exclude": ["node_modules", "**/*.test.ts"]
}
```
