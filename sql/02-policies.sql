-- 관리자만 회사 기준값을 변경할 수 있습니다.
-- 기존의 anon 쓰기 및 using(true) 수업용 정책은 제거합니다.

revoke insert, update, delete on core.leadtime_plan from anon, authenticated;
revoke insert, update, delete on core.usage_profile from anon, authenticated;
grant update on core.leadtime_plan, core.usage_profile to authenticated;

alter table core.leadtime_plan enable row level security;
alter table core.usage_profile enable row level security;

drop policy if exists "수업용 전체 허용" on core.leadtime_plan;
drop policy if exists leadtime_plan_select on core.leadtime_plan;
drop policy if exists leadtime_plan_admin_update on core.leadtime_plan;
create policy leadtime_plan_select on core.leadtime_plan
for select to authenticated
using (exists (select 1 from core.app_user where user_id = auth.uid() and active = true));
create policy leadtime_plan_admin_update on core.leadtime_plan
for update to authenticated
using (core.is_admin())
with check (core.is_admin());

drop policy if exists "수업용 전체 허용" on core.usage_profile;
drop policy if exists usage_profile_select on core.usage_profile;
drop policy if exists usage_profile_admin_update on core.usage_profile;
create policy usage_profile_select on core.usage_profile
for select to authenticated
using (exists (select 1 from core.app_user where user_id = auth.uid() and active = true));
create policy usage_profile_admin_update on core.usage_profile
for update to authenticated
using (core.is_admin())
with check (core.is_admin());
