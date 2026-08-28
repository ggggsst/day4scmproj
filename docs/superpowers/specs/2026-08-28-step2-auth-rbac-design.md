# STEP 2 인증·Role·RBAC 설계

## 목표

Supabase Auth의 세션을 Next.js 서버와 브라우저가 공유하고, ADMIN/USER 권한을 프론트엔드 메뉴, 서버 보호 로직, PostgreSQL RLS의 세 계층에서 일관되게 강제한다. 메뉴 숨김은 UX 보조 수단으로만 사용하며, 권한의 최종 판단은 서버와 DB가 담당한다.

## 확정 결정

- `auth.users`에 가입한 사용자는 `core.app_user`에 `USER`, `active = true`로 자동 생성한다.
- 최초 ADMIN은 자동 지정하지 않는다. 운영자가 SQL Editor에서 특정 사용자를 한 번만 `ADMIN`으로 승격한다.
- service role client는 브라우저 번들에 포함하지 않으며, 이번 범위에서는 publishable key와 SSR 세션으로 처리 가능한 작업을 우선한다.
- 기존 계산 SQL, raw 데이터, workflow 컴포넌트는 변경하지 않는다.

## 데이터베이스

신규 migration에 다음을 추가한다.

- `core.app_user`: `auth.users(id)` FK, email/name/department, `role` check(`ADMIN`, `USER`), `active`, login/생성/수정 시각
- `core.audit_log`: actor, action, target_type, target_id, before/after JSONB, at
- `core.is_admin()`: 현재 `auth.uid()`의 활성 ADMIN 여부를 반환하는 재사용 함수
- `auth.users` insert 후 `core.app_user`를 생성하는 trigger
- `updated_at` 자동 갱신 trigger

관리자 변경은 서버 action에서 대상의 변경 전 상태를 읽고, 변경 후 상태와 함께 audit row를 기록한다. 자기 자신의 ADMIN 권한 제거와 비활성화는 서버 action과 RLS 정책에서 모두 거부한다.

## 인증 흐름

- `lib/supabase/server.ts`: `@supabase/ssr`의 cookie 기반 server client로 교체
- `lib/supabase/client.ts`: browser client는 SSR browser client로 구성
- `lib/auth.ts`: `getRole()`, `requireUser()`, `requireAdmin()`을 제공하고 비활성 사용자도 거부
- `middleware.ts`: 보호 경로에 세션이 없으면 `/login?next=...`로 redirect
- `/login`: signInWithPassword, 실패 메시지, 허용된 next 경로 복귀
- 로그아웃: server action에서 `signOut` 후 `/login`으로 이동

`/admin/*`의 최종 보호는 admin layout/page와 관리자 action에서 `requireAdmin()`을 호출해 수행한다. USER가 직접 route/action을 호출하면 서버에서 403 또는 권한 오류를 반환한다.

## RLS 및 권한

- `anon`의 `core` 쓰기 권한과 기존 `using(true)` 정책을 제거한다.
- `authenticated`는 활성 사용자로서 허용된 분석 조회만 수행한다.
- `core.app_user`는 본인 행 조회만 허용하고, role/active 변경은 ADMIN만 허용한다.
- `core.audit_log`는 일반 사용자의 직접 insert를 막고, 관리자 변경 기록은 보안 정의 함수 또는 제한된 서버 경로를 통해 기록한다.
- 관리자 mutation은 `core.is_admin()` 조건을 사용한다.
- analytics 조회 권한은 기존 화면 동작을 보존하되 anon 접근은 차단한다.
- 기존 업무 데이터 정책은 실제 테이블별 현황을 확인한 뒤 과도하게 열린 정책만 교체한다.

## 관리자 화면

`/admin/users`에서 활성 사용자 목록, role, 활성 상태를 표시하고 ADMIN만 role 변경·활성/비활성 작업을 수행한다. 자기 계정의 관리자 권한 제거와 비활성화 버튼은 비활성화하며, 서버에서도 동일 조건을 재검증한다.

## 영향 파일

- 신규: `supabase/migrations/*_auth_rbac.sql`, `lib/auth.ts`, `middleware.ts`, `app/(auth)/login/page.tsx`, `app/(auth)/actions.ts`, `app/(admin)/admin/users/page.tsx`, 관리자 action/UI 파일, auth/RBAC 테스트
- 수정: `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/menu.ts`, route group layouts, `sql/01-grants.sql`, `sql/02-policies.sql`, `아키텍처.md`
- 유지: `components/workflow/*`, 분석 계산 함수와 기존 analytics SQL

## 검증 기준

- 미로그인 보호 경로 redirect
- USER의 `/admin/*` 접근 거부
- ADMIN의 `/admin/users` 접근 허용
- 직접 action 호출 시 USER mutation 거부
- anon core write 거부
- role 변경 audit 기록 생성
- 자기 role/active 변경 거부
- `npm test`, `npm run build` 성공

## 수동 설정

Supabase SQL migration 적용 후 첫 사용자를 `USER`로 가입시키고, SQL Editor에서 검증된 사용자의 `core.app_user.role`을 `ADMIN`으로 한 번 승격한다. 이후 관리자 화면에서 role과 active를 관리한다.
