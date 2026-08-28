# STEP 2 인증·RBAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supabase Auth 세션과 PostgreSQL RLS를 연결해 ADMIN/USER 권한을 프론트엔드·서버·DB에서 모두 강제한다.

**Architecture:** `@supabase/ssr` cookie session을 middleware와 서버 컴포넌트가 사용한다. `core.app_user`가 auth 사용자의 role/active를 관리하고, `lib/auth.ts`와 `core.is_admin()`이 각각 서버와 DB 권한 경계를 제공한다. 관리 mutation은 서버 action에서 재검증하고 audit log를 기록한다.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase SSR, PostgreSQL RLS, Node test runner

**Spec:** `docs/superpowers/specs/2026-08-28-step2-auth-rbac-design.md`

## Global Constraints

- 최초 사용자는 자동으로 `USER`가 되며 특정 계정·이메일·비밀번호를 코드나 SQL에 하드코딩하지 않는다.
- service role key는 서버 전용 파일에도 이번 범위에서 사용하지 않으며, 브라우저 번들에 절대 포함하지 않는다.
- `raw` 스키마를 화면에서 직접 조회하지 않는다.
- 기존 계산 SQL, 분석 뷰, `components/workflow/*`는 변경하지 않는다.
- Tailwind, styled-components, CSS Modules를 추가하지 않는다.
- 화면 권한 확인은 보조 UX일 뿐이며 서버 action과 RLS가 최종 권한을 검증한다.
- UI 문구와 주석은 한국어로 작성한다.

### Task 1: 현재 RLS 기준 테스트와 migration 뼈대

**Files:**
- Create: `supabase/migrations/20260828000100_create_auth_rbac.sql`
- Modify: `sql/01-grants.sql`
- Modify: `sql/02-policies.sql`
- Test: `lib/auth-rbac.test.ts`

**Interfaces:**
- Produces: `core.app_user`, `core.audit_log`, `core.is_admin()` 및 auth trigger
- Produces: authenticated-only core/analytics access policy 기준

- [ ] **Step 1: Write the failing test**

```ts
test('RBAC migration defines app user, audit log, and admin guard', () => {
  const sql = readFileSync('supabase/migrations/20260828000100_create_auth_rbac.sql', 'utf8');
  assert.match(sql, /create table if not exists core\.app_user/i);
  assert.match(sql, /create table if not exists core\.audit_log/i);
  assert.match(sql, /create or replace function core\.is_admin/i);
  assert.match(sql, /after insert on auth\.users/i);
  assert.doesNotMatch(sql, /insert into core\.app_user[^;]*@/is);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/auth-rbac.test.ts`
Expected: FAIL because the migration and test do not exist.

- [ ] **Step 3: Write minimal implementation**

Create the tables with `auth.users(id)` FK, role/active constraints, timestamps, indexes, `core.is_admin()` using `auth.uid()`, and a trigger that creates a `USER` row from `new.id`, `new.email`, and metadata-derived name/department only when present. Do not add any fixed email or credential. Update grants to remove anon core access and update policies so only authenticated active users read allowed data and only active ADMIN users mutate user records.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/auth-rbac.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260828000100_create_auth_rbac.sql sql/01-grants.sql sql/02-policies.sql lib/auth-rbac.test.ts
git commit -m "STEP2 인증 RBAC RLS 기반 추가"
```

### Task 2: SSR Supabase clients and auth helpers

**Files:**
- Modify: `lib/supabase/server.ts`
- Modify: `lib/supabase/client.ts`
- Create: `lib/auth.ts`
- Test: `lib/auth.test.ts`

**Interfaces:**
- Produces: `getRole(): Promise<'ADMIN' | 'USER' | null>`
- Produces: `requireUser(): Promise<{ user: User; profile: AppUser }>`
- Produces: `requireAdmin(): Promise<{ user: User; profile: AppUser }>`

- [ ] **Step 1: Write failing tests for role normalization and protected outcomes**
- [ ] **Step 2: Run the focused tests and confirm expected failure**
- [ ] **Step 3: Implement cookie-aware `createServerClient` with `cookies()` and browser `createBrowserClient`**
- [ ] **Step 4: Implement server-only helpers that query `core.app_user`, reject missing/inactive users, and throw a typed unauthorized/forbidden error**
- [ ] **Step 5: Run `npm test -- lib/auth.test.ts` and confirm pass**
- [ ] **Step 6: Commit**

### Task 3: Middleware and route-group protection

**Files:**
- Create: `middleware.ts`
- Modify: `app/(auth)/layout.tsx`
- Modify: `app/(user)/layout.tsx`
- Modify: `app/(admin)/layout.tsx`
- Test: `lib/middleware.test.ts`

**Interfaces:**
- Produces: unauthenticated protected requests redirect to `/login?next=<encoded path>`
- Produces: USER admin requests receive a server-side 403 response

- [ ] **Step 1: Write failing tests for public, protected, and admin paths**
- [ ] **Step 2: Run tests and confirm failure**
- [ ] **Step 3: Implement middleware session refresh and path classification without trusting client role fields**
- [ ] **Step 4: Implement admin layout protection with `requireAdmin()` and user layout protection with `requireUser()`**
- [ ] **Step 5: Run focused tests and `npm run build`**
- [ ] **Step 6: Commit**

### Task 4: Login, logout, and next redirect

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/actions.ts`
- Modify: `lib/menu.ts`
- Test: `lib/auth-flow.test.ts`

**Interfaces:**
- Produces: login form action with email/password inputs, Korean failure message, safe relative `next` redirect
- Produces: logout action that clears the SSR session

- [ ] **Step 1: Write failing tests for safe next handling and error mapping**
- [ ] **Step 2: Run tests and confirm failure**
- [ ] **Step 3: Implement login/logout server actions using publishable key SSR client only**
- [ ] **Step 4: Implement the login page using existing pure CSS classes and no hardcoded account**
- [ ] **Step 5: Run focused tests and build**
- [ ] **Step 6: Commit**

### Task 5: Admin user management and audit actions

**Files:**
- Create: `app/(admin)/admin/users/page.tsx`
- Create: `app/(admin)/admin/users/actions.ts`
- Modify: `lib/menu.ts`
- Test: `lib/admin-users.test.ts`

**Interfaces:**
- Produces: admin-only user list query
- Produces: `changeUserRole(targetUserId, role)` and `changeUserActive(targetUserId, active)` server actions

- [ ] **Step 1: Write failing tests for USER denial, self-demotion denial, self-deactivation denial, and audit payload shape**
- [ ] **Step 2: Run tests and confirm expected failure**
- [ ] **Step 3: Implement actions beginning with `requireAdmin()`, load actor/target from DB, reject actor=target for protected changes, update through RLS, and insert before/after audit data**
- [ ] **Step 4: Implement `/admin/users` server page and forms; disable self-protective controls only as UX aid while keeping server enforcement**
- [ ] **Step 5: Add ADMIN menu entry without embedding role assumptions in the page**
- [ ] **Step 6: Run focused tests and build**
- [ ] **Step 7: Commit**

### Task 6: Documentation, SQL review, and full verification

**Files:**
- Modify: `아키텍처.md`
- Modify: `README_배포전_확인.md` if present
- Test: all `lib/**/*.test.ts`

- [ ] **Step 1: Add migration application order, first-admin manual promotion SQL template using a runtime-supplied user UUID/email, and no-hardcoded-account warning to documentation**
- [ ] **Step 2: Scan SQL and source for fixed credentials, emails, service role keys, anon write grants, and `using (true)` policies**
- [ ] **Step 3: Run `npm test`**
- [ ] **Step 4: Run `npm run build`**
- [ ] **Step 5: Review changed files and report manual Supabase settings**
- [ ] **Step 6: Commit documentation and final verification**
