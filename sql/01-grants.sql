-- Supabase Data API에서 공개 익명 역할의 데이터 접근을 차단하고,
-- 로그인한 활성 사용자에게 화면 조회 권한을 부여합니다.

revoke all on schema core from anon;
revoke all on schema analytics from anon;
revoke all on all tables in schema core from anon;
revoke all on all tables in schema analytics from anon;

grant usage on schema core to authenticated;
grant usage on schema analytics to authenticated;
grant select on all tables in schema core to authenticated;
grant select on all tables in schema analytics to authenticated;

alter default privileges in schema core
  revoke all on tables from anon;
alter default privileges in schema analytics
  revoke all on tables from anon;
alter default privileges in schema core
  grant select on tables to authenticated;
alter default privileges in schema analytics
  grant select on tables to authenticated;

-- raw 스키마는 API 역할에 노출하지 않습니다.
