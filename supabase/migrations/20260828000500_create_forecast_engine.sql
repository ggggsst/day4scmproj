create extension if not exists pgcrypto;

alter table core.forecast_setting
  add column if not exists forecast_horizon integer not null default 3;

alter table core.forecast_setting
  drop constraint if exists forecast_setting_horizon_check;
alter table core.forecast_setting
  add constraint forecast_setting_horizon_check check (forecast_horizon > 0 and forecast_horizon <= 365);

create table if not exists core.model_config (
  model_id text primary key,
  model_name text not null,
  family text not null,
  engine text not null default 'SQL',
  version text not null,
  enabled boolean not null default true,
  is_default boolean not null default false,
  applicable_demand_type text[] not null default array['SMOOTH','INTERMITTENT','ERRATIC','LUMPY'],
  parameters jsonb not null default '{}'::jsonb,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  constraint model_config_engine_check check (engine = 'SQL'),
  constraint model_config_demand_type_check check (applicable_demand_type <@ array['SMOOTH','INTERMITTENT','ERRATIC','LUMPY']::text[])
);

create table if not exists core.model_version (
  model_version_id uuid primary key default gen_random_uuid(),
  model_id text not null references core.model_config(model_id),
  version text not null,
  definition jsonb not null,
  captured_at timestamptz not null default now(),
  captured_by uuid references auth.users(id)
);

create table if not exists core.forecast_run (
  run_id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('RUNNING','SUCCESS','FAILED')),
  granularity text not null check (granularity in ('DAY','WEEK','MONTH')),
  train_start date not null,
  train_end date not null,
  horizon integer not null check (horizon > 0),
  champion_metric text,
  data_snapshot_at timestamptz not null,
  models text[] not null default '{}',
  n_models integer not null default 0,
  n_items integer not null default 0,
  n_rows integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms bigint,
  triggered_by uuid references auth.users(id),
  triggered_email text,
  note text,
  message text
);

create table if not exists core.forecast_result (
  run_id uuid not null references core.forecast_run(run_id) on delete restrict,
  model_id text not null references core.model_config(model_id),
  item_id text not null,
  period date not null,
  model_version text not null,
  predicted_qty numeric,
  p50 numeric,
  p80 numeric,
  p90 numeric,
  sigma numeric,
  basis text not null,
  primary key (run_id, model_id, item_id, period)
);

create index if not exists forecast_result_run_idx on core.forecast_result(run_id);
create index if not exists forecast_run_started_idx on core.forecast_run(started_at desc);

insert into core.model_config (model_id, model_name, family, engine, version, enabled, is_default, applicable_demand_type, parameters, description)
values
  ('MA_3M', '3기간 이동평균', 'MOVING_AVERAGE', 'SQL', '1.0.0', true, true, array['SMOOTH','INTERMITTENT','ERRATIC','LUMPY'], '{"window":3,"z80":0.841621,"z90":1.281552}', '직전 3개 학습 기간 평균'),
  ('MA_6M', '6기간 이동평균', 'MOVING_AVERAGE', 'SQL', '1.0.0', true, false, array['SMOOTH','INTERMITTENT','ERRATIC','LUMPY'], '{"window":6,"z80":0.841621,"z90":1.281552}', '직전 6개 학습 기간 평균'),
  ('WMA_3M', '3기간 가중 이동평균', 'WEIGHTED_MOVING_AVERAGE', 'SQL', '1.0.0', true, false, array['SMOOTH','INTERMITTENT','ERRATIC','LUMPY'], '{"weights":[1,2,3],"z80":0.841621,"z90":1.281552}', '최근순 가중치 3:2:1'),
  ('PY_SAME_MONTH', '전년 동기간', 'SEASONAL_NAIVE', 'SQL', '1.0.0', true, false, array['SMOOTH','INTERMITTENT','ERRATIC','LUMPY'], '{"lag_periods":12,"z80":0.841621,"z90":1.281552}', '12기간 전 동일 기간 값'),
  ('SEASONAL_NAIVE', '계절성 나이브', 'SEASONAL_NAIVE', 'SQL', '1.0.0', true, false, array['SMOOTH','INTERMITTENT','ERRATIC','LUMPY'], '{"seasonal_periods":12,"z80":0.841621,"z90":1.281552}', '12기간 계절성 반복')
on conflict (model_id) do nothing;

create or replace function core.set_forecast_engine_updated_at()
returns trigger language plpgsql security invoker
set search_path = pg_catalog, public, core
as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists model_config_set_updated_at on core.model_config;
create trigger model_config_set_updated_at before update on core.model_config
for each row execute function core.set_forecast_engine_updated_at();

create or replace view core.v_forecast_data_clock as
select coalesce(max(loaded_at), now()) as data_snapshot_at
from raw.usage_history;

create or replace function core.run_baseline_forecast()
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, core, analytics
as $$
declare
  v_run_id uuid;
  v_setting record;
  v_snapshot timestamptz;
  v_user_email text;
begin
  if not core.is_admin() then raise exception 'Forecast 실행은 관리자만 가능합니다.' using errcode = '42501'; end if;
  select * into v_setting from core.forecast_setting where active = true limit 1;
  if not found then raise exception '활성 forecast_setting이 없습니다.'; end if;
  select data_snapshot_at into v_snapshot from core.v_forecast_data_clock;
  select email into v_user_email from auth.users where id = auth.uid();

  insert into core.forecast_run(status, granularity, train_start, train_end, horizon, data_snapshot_at, triggered_by, triggered_email)
  values ('RUNNING', v_setting.granularity, v_setting.train_start, v_setting.train_end, v_setting.forecast_horizon, v_snapshot, auth.uid(), v_user_email)
  returning run_id into v_run_id;

  begin
    create temp table tmp_forecast_models on commit drop as
      select * from core.model_config where enabled = true and engine = 'SQL';
    create temp table tmp_forecast_demand on commit drop as
      select item_id, period_start, quantity
      from core.v_train_period_grid;
    create temp table tmp_forecast_future on commit drop as
      select i.item_id,
        case v_setting.granularity
          when 'DAY' then v_setting.train_end + n
          when 'WEEK' then date_trunc('week', v_setting.train_end)::date + (n * 7)
          else (date_trunc('month', v_setting.train_end) + (n * interval '1 month'))::date
        end as period_start
      from (select distinct item_id from tmp_forecast_demand) i
      cross join generate_series(1, v_setting.forecast_horizon) n;

    create temp table tmp_forecast_fitted on commit drop as
      select m.model_id, d.item_id, d.period_start, d.quantity,
        case
          when m.model_id in ('MA_3M','MA_6M') then (
            select avg(x.quantity) from (
              select d2.quantity from tmp_forecast_demand d2
              where d2.item_id = d.item_id and d2.period_start < d.period_start and d2.quantity is not null
              order by d2.period_start desc limit ((m.parameters->>'window')::integer)
            ) x)
          when m.model_id = 'WMA_3M' then (
            select sum(x.quantity * x.weight) / 6 from (
              select d2.quantity,
                (m.parameters->'weights'->>((3 - row_number() over (order by d2.period_start desc))::integer))::numeric as weight
              from tmp_forecast_demand d2
              where d2.item_id = d.item_id and d2.period_start < d.period_start and d2.quantity is not null
              order by d2.period_start desc limit 3
            ) x)
          when m.model_id in ('PY_SAME_MONTH','SEASONAL_NAIVE') then (
            select d2.quantity from tmp_forecast_demand d2
            where d2.item_id = d.item_id and d2.period_start = d.period_start -
              case v_setting.granularity when 'DAY' then coalesce((m.parameters->>'lag_periods')::integer, (m.parameters->>'seasonal_periods')::integer) * interval '1 day' when 'WEEK' then coalesce((m.parameters->>'lag_periods')::integer, (m.parameters->>'seasonal_periods')::integer) * interval '1 week' else coalesce((m.parameters->>'lag_periods')::integer, (m.parameters->>'seasonal_periods')::integer) * interval '1 month' end
            limit 1)
          else null
        end as fitted
      from tmp_forecast_models m cross join tmp_forecast_demand d;

    create temp table tmp_forecast_sigma on commit drop as
      select model_id, item_id, stddev_samp(quantity - fitted) as sigma
      from tmp_forecast_fitted where fitted is not null
      group by model_id, item_id;

    insert into core.model_version(model_id, version, definition, captured_by)
      select model_id, version, jsonb_build_object('model_id',model_id,'model_name',model_name,'family',family,'engine',engine,'version',version,'applicable_demand_type',applicable_demand_type,'parameters',parameters,'description',description), auth.uid()
      from tmp_forecast_models;

    insert into core.forecast_result(run_id, model_id, item_id, period, model_version, predicted_qty, p50, p80, p90, sigma, basis)
    with points as (
      select m.model_id, m.version, m.parameters, f.item_id, f.period_start,
        case
          when m.model_id in ('MA_3M','MA_6M') then (select avg(x.quantity) from (select d.quantity from tmp_forecast_demand d where d.item_id=f.item_id and d.period_start < f.period_start and d.quantity is not null order by d.period_start desc limit ((m.parameters->>'window')::integer)) x)
          when m.model_id = 'WMA_3M' then (select sum(x.quantity*x.weight) / nullif(sum(x.weight), 0) from (select d.quantity, (m.parameters->'weights'->>((3 - row_number() over (order by d.period_start desc))::integer))::numeric as weight from tmp_forecast_demand d where d.item_id=f.item_id and d.period_start < f.period_start and d.quantity is not null order by d.period_start desc limit 3) x)
          else (select d.quantity from tmp_forecast_demand d where d.item_id=f.item_id and d.period_start = f.period_start - case v_setting.granularity when 'DAY' then coalesce((m.parameters->>'lag_periods')::integer, (m.parameters->>'seasonal_periods')::integer) * interval '1 day' when 'WEEK' then coalesce((m.parameters->>'lag_periods')::integer, (m.parameters->>'seasonal_periods')::integer) * interval '1 week' else coalesce((m.parameters->>'lag_periods')::integer, (m.parameters->>'seasonal_periods')::integer) * interval '1 month' end limit 1)
        end as point
      from tmp_forecast_models m cross join tmp_forecast_future f
      where (m.applicable_demand_type is null or exists (select 1 from analytics.v_sku_demand_profile p where p.item_id=f.item_id and p.demand_type = any(m.applicable_demand_type)))
      group by m.model_id,m.version,m.parameters,f.item_id,f.period_start
    )
    select v_run_id, p.model_id, p.item_id, p.period_start, p.version, p.point, p.point,
      case when p.point is not null and s.sigma is not null and p.parameters ? 'z80' then p.point + s.sigma * (p.parameters->>'z80')::numeric else null end,
      case when p.point is not null and s.sigma is not null and p.parameters ? 'z90' then p.point + s.sigma * (p.parameters->>'z90')::numeric else null end,
      s.sigma, case when p.point is null then 'INSUFFICIENT_HISTORY' else 'BASELINE_TRAIN_ONLY' end
    from points p left join tmp_forecast_sigma s on s.model_id=p.model_id and s.item_id=p.item_id;

    update core.forecast_run set status='SUCCESS', models=(select array_agg(model_id order by model_id) from tmp_forecast_models), n_models=(select count(*) from tmp_forecast_models), n_items=(select count(distinct item_id) from core.forecast_result where run_id=v_run_id), n_rows=(select count(*) from core.forecast_result where run_id=v_run_id), finished_at=clock_timestamp(), duration_ms=extract(epoch from (clock_timestamp()-started_at))*1000 where run_id=v_run_id;
  exception when others then
    update core.forecast_run set status='FAILED', finished_at=clock_timestamp(), duration_ms=extract(epoch from (clock_timestamp()-started_at))*1000, message=sqlerrm where run_id=v_run_id;
    return v_run_id;
  end;
  return v_run_id;
end;
$$;

create or replace view analytics.v_model_config as select model_id, model_name, family, engine, version, enabled, is_default, applicable_demand_type, parameters, description, updated_at, updated_by from core.model_config;
create or replace view analytics.v_forecast_run as
select r.*, (c.data_snapshot_at > r.data_snapshot_at) as is_stale
from core.forecast_run r cross join core.v_forecast_data_clock c;
create or replace view analytics.v_forecast_result as select * from core.forecast_result;
create or replace view analytics.v_forecast_run_kpi as
select run_id, status, n_models, n_items, n_rows, is_stale from analytics.v_forecast_run;

alter table core.model_config enable row level security;
alter table core.model_version enable row level security;
alter table core.forecast_run enable row level security;
alter table core.forecast_result enable row level security;
revoke all on core.model_config, core.model_version, core.forecast_run, core.forecast_result from anon;
grant select on analytics.v_model_config, analytics.v_forecast_run, analytics.v_forecast_result, analytics.v_forecast_run_kpi to authenticated;
grant usage on schema analytics, core to authenticated;
revoke execute on function core.run_baseline_forecast() from public, anon;
grant execute on function core.run_baseline_forecast() to authenticated;
revoke all on analytics.v_model_config, analytics.v_forecast_run, analytics.v_forecast_result, analytics.v_forecast_run_kpi from anon;
drop policy if exists model_config_select on core.model_config;
create policy model_config_select on core.model_config for select to authenticated using (core.is_active_user());
drop policy if exists model_config_admin_mutation on core.model_config;
create policy model_config_admin_mutation on core.model_config for all to authenticated using (core.is_admin()) with check (core.is_admin());
grant update, insert, delete on core.model_config to authenticated;
drop policy if exists forecast_run_select on core.forecast_run;
create policy forecast_run_select on core.forecast_run for select to authenticated using (core.is_active_user());
drop policy if exists forecast_result_select on core.forecast_result;
create policy forecast_result_select on core.forecast_result for select to authenticated using (core.is_active_user());
