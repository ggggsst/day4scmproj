create extension if not exists pgcrypto;
create schema if not exists core;
create schema if not exists analytics;

-- 기존 raw 입력 테이블은 삭제·재생성하지 않고 적재 추적 메타데이터만 확장합니다.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['shipment_log', 'supplier_master', 'item_master', 'inventory', 'usage_history', 'forecast', 'goods_receipt', 'purchase_order'] loop
    execute format('alter table raw.%I add column if not exists batch_id uuid', table_name);
    execute format('alter table raw.%I add column if not exists source_type text', table_name);
    execute format('alter table raw.%I add column if not exists loaded_at timestamptz default now()', table_name);
    execute format('alter table raw.%I add column if not exists source_record_id text', table_name);
  end loop;
end;
$$;

create table if not exists raw.business_event (
  event_id uuid primary key default gen_random_uuid(),
  event_type text not null,
  event_date date not null,
  item_id text,
  quantity numeric,
  customer_id text,
  note text,
  attributes jsonb,
  batch_id uuid,
  source_type text,
  loaded_at timestamptz default now(),
  source_record_id text
);

create table if not exists raw.sales_order (
  sales_order_id uuid primary key default gen_random_uuid(),
  source_order_id text,
  order_date date,
  item_id text,
  customer_id text,
  quantity numeric,
  requested_date date,
  status text,
  note text,
  batch_id uuid,
  source_type text,
  loaded_at timestamptz default now(),
  source_record_id text
);

create table if not exists raw.item_substitute (
  item_id text not null,
  substitute_item_id text not null,
  priority integer,
  valid_from date,
  valid_to date,
  note text,
  batch_id uuid,
  source_type text,
  loaded_at timestamptz default now(),
  source_record_id text,
  primary key (item_id, substitute_item_id)
);

create table if not exists core.policy_config (
  policy_key text primary key,
  policy_value jsonb not null,
  value_type text not null check (value_type in ('NUMBER', 'BOOLEAN', 'TEXT', 'JSON')),
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists core.outlier_rule (
  rule_code text primary key,
  rule_name text not null,
  condition_type text not null check (condition_type in ('PROJECT', 'RETURN', 'DUPLICATE', 'CUSTOM')),
  condition_value text,
  exclude_from_training boolean not null default false,
  active boolean not null default true,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists core.item_policy (
  item_id text primary key,
  moq numeric check (moq is null or moq >= 0),
  pack_size numeric check (pack_size is null or pack_size > 0),
  item_grade text,
  service_level numeric check (service_level is null or service_level between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists core.forecast_setting (
  setting_id uuid primary key default gen_random_uuid(),
  train_start date not null,
  train_end date not null,
  test_start date not null,
  test_end date not null,
  granularity text not null check (granularity in ('DAY', 'WEEK', 'MONTH')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint forecast_setting_train_order check (train_start <= train_end),
  constraint forecast_setting_test_order check (test_start <= test_end),
  constraint forecast_setting_window_order check (train_end < test_start)
);

create unique index if not exists forecast_setting_one_active_idx
  on core.forecast_setting (active)
  where active = true;

create or replace function core.set_forecast_model_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, core
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['policy_config', 'outlier_rule', 'item_policy', 'forecast_setting'] loop
    execute format('drop trigger if exists %I_set_updated_at on core.%I', table_name, table_name);
    execute format('create trigger %I_set_updated_at before update on core.%I for each row execute function core.set_forecast_model_updated_at()', table_name, table_name);
  end loop;
end;
$$;

create or replace function core.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, core
as $$
  select exists (
    select 1 from core.app_user
    where user_id = auth.uid() and active = true
  );
$$;

create or replace view core.v_train_demand as
with setting as (
  select train_start, train_end, test_start, test_end
  from core.forecast_setting
  where active = true
  limit 1
)
select
  u.usage_id,
  upper(regexp_replace(u.item_id, '[\s\-_]', '', 'g')) as item_id,
  u.use_date as demand_date,
  u.qty as demand_qty,
  u.warehouse,
  u.note,
  s.train_start,
  s.train_end
from raw.usage_history u
join setting s on u.use_date >= s.train_start and u.use_date <= s.train_end
where not (u.use_date >= s.test_start and u.use_date <= s.test_end);

create or replace view core.v_test_actual as
with setting as (
  select test_start, test_end
  from core.forecast_setting
  where active = true
  limit 1
)
select
  u.usage_id,
  upper(regexp_replace(u.item_id, '[\s\-_]', '', 'g')) as item_id,
  u.use_date as actual_date,
  u.qty as actual_qty,
  u.warehouse,
  u.note,
  s.test_start,
  s.test_end
from raw.usage_history u
join setting s on u.use_date >= s.test_start and u.use_date <= s.test_end;

create or replace view analytics.v_data_coverage as
with actual as (
  select min(use_date) as data_start, max(use_date) as data_end
  from raw.usage_history
), setting as (
  select train_start, train_end, test_start, test_end, granularity
  from core.forecast_setting
  where active = true
  limit 1
), counts as (
  select
    (select count(*) from core.v_train_demand) as train_row_count,
    (select count(*) from core.v_test_actual) as test_row_count
)
select
  a.data_start,
  a.data_end,
  s.train_start,
  s.train_end,
  s.test_start,
  s.test_end,
  s.granularity,
  c.train_row_count,
  c.test_row_count,
  (
    s.train_start is not null and s.train_end is not null
    and s.train_start <= s.train_end
    and a.data_start is not null and a.data_start <= s.train_start
    and a.data_end >= s.train_end
  ) as train_window_ok,
  (
    s.test_start is not null and s.test_end is not null
    and s.test_start <= s.test_end
    and a.data_start is not null and a.data_start <= s.test_start
    and a.data_end >= s.test_end
  ) as test_window_ok,
  (c.train_row_count = 0 or not exists (
    select 1 from core.v_train_demand t
    join core.v_test_actual v on t.item_id = v.item_id and t.demand_date = v.actual_date
  )) as data_isolation_ok
from actual a
left join setting s on true
cross join counts c;

-- API 역할은 raw를 직접 읽거나 쓰지 못합니다.
revoke all on schema raw from anon, authenticated;
revoke all on all tables in schema raw from anon, authenticated;

alter table raw.business_event enable row level security;
alter table raw.sales_order enable row level security;
alter table raw.item_substitute enable row level security;

-- 정책/설정은 활성 authenticated 사용자가 읽고, ADMIN만 변경합니다.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['policy_config', 'outlier_rule', 'item_policy', 'forecast_setting'] loop
    execute format('alter table core.%I enable row level security', table_name);
    execute format('revoke all on table core.%I from anon', table_name);
    execute format('grant select on table core.%I to authenticated', table_name);
    execute format('drop policy if exists %I_select on core.%I', table_name, table_name);
    execute format('create policy %I_select on core.%I for select to authenticated using (core.is_active_user())', table_name, table_name);
    execute format('drop policy if exists %I_admin_mutation on core.%I', table_name, table_name);
    execute format('create policy %I_admin_mutation on core.%I for all to authenticated using (core.is_admin()) with check (core.is_admin())', table_name, table_name);
    execute format('grant insert, update, delete on table core.%I to authenticated', table_name);
  end loop;
end;
$$;

grant usage on schema core, analytics to authenticated;
grant select on core.v_train_demand, core.v_test_actual, analytics.v_data_coverage to authenticated;
revoke all on core.v_train_demand, core.v_test_actual, analytics.v_data_coverage from anon;

-- STEP 2에서 만든 profile RLS를 본인 이름/부서 수정까지 확장합니다.
-- role/active는 audit log를 남기는 RPC로만 변경할 수 있도록 직접 UPDATE를 차단합니다.
alter function core.admin_change_user_role(uuid, text) security definer;
alter function core.admin_change_user_active(uuid, boolean) security definer;
revoke update (role, active) on core.app_user from authenticated;
grant update (name, department) on core.app_user to authenticated;
drop policy if exists app_user_self_profile_update on core.app_user;
create policy app_user_self_profile_update on core.app_user
for update to authenticated
using (user_id = auth.uid() and core.is_active_user())
with check (user_id = auth.uid() and core.is_active_user());
