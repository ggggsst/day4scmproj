alter table core.forecast_setting add column if not exists champion_metric text not null default 'WAPE';
alter table core.forecast_setting drop constraint if exists forecast_setting_champion_metric_check;
alter table core.forecast_setting add constraint forecast_setting_champion_metric_check check (champion_metric in ('WAPE','MAPE','RMSE','MAE'));
alter table core.model_config add column if not exists reference_model_id text references core.model_config(model_id);

create table if not exists core.backtest_run (
  backtest_run_id uuid primary key default gen_random_uuid(),
  forecast_run_id uuid not null references core.forecast_run(run_id),
  test_start date not null,
  test_end date not null,
  metric text not null,
  status text not null check (status in ('RUNNING','SUCCESS','FAILED')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  triggered_by uuid references auth.users(id),
  message text
);

create table if not exists core.model_performance (
  performance_id uuid primary key default gen_random_uuid(),
  run_id uuid not null references core.backtest_run(backtest_run_id) on delete cascade,
  model_id text not null,
  model_version text not null,
  item_id text not null,
  n_periods integer not null default 0,
  wape numeric,
  mape numeric,
  bias numeric,
  rmse numeric,
  mae numeric,
  baseline_improvement numeric,
  rank integer,
  calculation_status text not null,
  reason_code text,
  calculated_at timestamptz not null default now()
);

create table if not exists core.champion_model (
  champion_id uuid primary key default gen_random_uuid(),
  item_id text not null,
  champion_model_id text,
  model_version text,
  champion_metric text not null,
  champion_metric_value numeric,
  wape numeric,
  mape numeric,
  bias numeric,
  rmse numeric,
  candidate_performance jsonb not null default '[]'::jsonb,
  selection_reason text,
  selection_method text not null check (selection_method in ('AUTO','MANUAL')),
  selected_at timestamptz not null default now(),
  selected_by uuid references auth.users(id),
  backtest_run_id uuid references core.backtest_run(backtest_run_id),
  reason_code text
);

create index if not exists model_performance_run_item_idx on core.model_performance(run_id, item_id);
create index if not exists champion_model_item_selected_idx on core.champion_model(item_id, selected_at desc);

create or replace function core.run_backtest(p_forecast_run_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, core, analytics
as $$
declare
  v_backtest_id uuid;
  v_forecast record;
  v_setting record;
begin
  if not core.is_admin() then raise exception 'Backtest 실행은 관리자만 가능합니다.' using errcode = '42501'; end if;
  select * into v_forecast from core.forecast_run where run_id = p_forecast_run_id and status = 'SUCCESS';
  if not found then raise exception '성공한 Forecast run을 찾을 수 없습니다.' using errcode = 'P0002'; end if;
  select * into v_setting from core.forecast_setting where active = true limit 1;
  if not found then raise exception '활성 forecast_setting이 없습니다.'; end if;

  insert into core.backtest_run(forecast_run_id, test_start, test_end, metric, status, triggered_by)
  values (p_forecast_run_id, v_setting.test_start, v_setting.test_end, v_setting.champion_metric, 'RUNNING', auth.uid())
  returning backtest_run_id into v_backtest_id;

  begin
    create temp table tmp_bt_pairs on commit drop as
    with model_items as (
      select distinct model_id, model_version, item_id from core.forecast_result where run_id = p_forecast_run_id
    ), actuals as (
      select item_id, actual_date as period, actual_qty from core.v_test_actual
    ), paired as (
      select mi.model_id, mi.model_version, mi.item_id, a.period, a.actual_qty, r.predicted_qty
      from model_items mi join actuals a on a.item_id = mi.item_id
      left join core.forecast_result r on r.run_id = p_forecast_run_id and r.model_id = mi.model_id and r.item_id = mi.item_id and r.period = a.period
      union all
      select r.model_id, r.model_version, r.item_id, r.period, null::numeric, r.predicted_qty
      from core.forecast_result r
      where r.run_id = p_forecast_run_id and not exists (select 1 from actuals a where a.item_id = r.item_id and a.period = r.period)
    ) select * from paired;

    insert into core.model_performance(run_id, model_id, model_version, item_id, n_periods, wape, mape, bias, rmse, mae, calculation_status, reason_code)
    select v_backtest_id, model_id, model_version, item_id, count(*)::integer,
      case when sum(abs(actual_qty)) filter (where actual_qty is not null and predicted_qty is not null) = 0 then null else sum(abs(predicted_qty - actual_qty)) filter (where actual_qty is not null and predicted_qty is not null) / sum(abs(actual_qty)) filter (where actual_qty is not null and predicted_qty is not null) end,
      case when count(*) filter (where actual_qty is not null and predicted_qty is not null and actual_qty <> 0) = 0 then null else avg(abs(predicted_qty - actual_qty) / abs(actual_qty)) filter (where actual_qty is not null and predicted_qty is not null and actual_qty <> 0) end,
      avg(predicted_qty - actual_qty) filter (where actual_qty is not null and predicted_qty is not null),
      case when count(*) filter (where actual_qty is not null and predicted_qty is not null) = 0 then null else sqrt(avg((predicted_qty - actual_qty)^2) filter (where actual_qty is not null and predicted_qty is not null)) end,
      avg(abs(predicted_qty - actual_qty)) filter (where actual_qty is not null and predicted_qty is not null),
      case when count(*) filter (where actual_qty is not null and predicted_qty is not null) = 0 then 'CALCULATION_UNAVAILABLE' when count(*) filter (where actual_qty is not null and predicted_qty is not null and actual_qty <> 0) = 0 then 'CALCULATION_UNAVAILABLE' when sum(abs(actual_qty)) filter (where actual_qty is not null and predicted_qty is not null) = 0 then 'CALCULATION_UNAVAILABLE' else 'CALCULATED' end,
      case when count(*) filter (where actual_qty is not null and predicted_qty is not null) = 0 then 'NO_FORECAST_OR_ACTUAL' when count(*) filter (where actual_qty is not null and predicted_qty is not null and actual_qty <> 0) = 0 then 'NO_NONZERO_ACTUAL' when sum(abs(actual_qty)) filter (where actual_qty is not null and predicted_qty is not null) = 0 then 'ZERO_ACTUAL_TOTAL' else null end
    from tmp_bt_pairs group by model_id, model_version, item_id;

    update core.model_performance p set baseline_improvement = (ref.wape - p.wape) / nullif(ref.wape, 0)
    from core.model_config c join core.model_performance ref on ref.run_id=p.run_id and ref.item_id=p.item_id and ref.model_id=coalesce(c.reference_model_id, (select model_id from core.model_config where is_default = true limit 1))
    where p.run_id=v_backtest_id and c.model_id=p.model_id and p.wape is not null and ref.wape is not null;

    with ranked as (
      select performance_id, row_number() over (partition by item_id order by case v_setting.champion_metric when 'MAPE' then mape when 'RMSE' then rmse when 'MAE' then mae else wape end asc, abs(bias) asc nulls last, rmse asc nulls last, model_id) as calculated_rank
      from core.model_performance
      where run_id=v_backtest_id and calculation_status='CALCULATED' and case v_setting.champion_metric when 'MAPE' then mape when 'RMSE' then rmse when 'MAE' then mae else wape end is not null
    ) update core.model_performance p set rank=r.calculated_rank from ranked r where p.performance_id=r.performance_id;

    insert into core.champion_model(item_id, champion_model_id, model_version, champion_metric, champion_metric_value, wape, mape, bias, rmse, candidate_performance, selection_reason, selection_method, selected_by, backtest_run_id, reason_code)
    select p.item_id, p.model_id, p.model_version, v_setting.champion_metric,
      case v_setting.champion_metric when 'MAPE' then p.mape when 'RMSE' then p.rmse when 'MAE' then p.mae else p.wape end,
      p.wape, p.mape, p.bias, p.rmse,
      (select jsonb_agg(jsonb_build_object('model_id', q.model_id, 'model_version', q.model_version, 'wape', q.wape, 'mape', q.mape, 'bias', q.bias, 'rmse', q.rmse, 'mae', q.mae, 'rank', q.rank, 'calculation_status', q.calculation_status, 'reason_code', q.reason_code) order by q.rank nulls last, q.model_id) from core.model_performance q where q.run_id=v_backtest_id and q.item_id=p.item_id),
      'champion_metric=' || v_setting.champion_metric || ', tie_break=absolute_bias,rmse,model_id', 'AUTO', auth.uid(), v_backtest_id, null
    from core.model_performance p where p.run_id=v_backtest_id and p.rank=1;

    update core.backtest_run set status='SUCCESS', finished_at=clock_timestamp() where backtest_run_id=v_backtest_id;
  exception when others then
    update core.backtest_run set status='FAILED', finished_at=clock_timestamp(), message=sqlerrm where backtest_run_id=v_backtest_id;
    return v_backtest_id;
  end;
  return v_backtest_id;
end;
$$;

create or replace function core.set_manual_champion(p_item_id text, p_model_id text, p_reason text)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public, core, analytics
as $$
declare
  v_previous core.champion_model;
  v_perf core.model_performance;
  v_metric text;
  v_new uuid;
begin
  if not core.is_admin() then raise exception '관리자 권한이 필요합니다.' using errcode = '42501'; end if;
  if nullif(trim(p_reason), '') is null then raise exception '수동 Champion 지정 사유가 필요합니다.' using errcode = '22023'; end if;
  select * into v_perf from core.model_performance p where p.item_id=p_item_id and p.model_id=p_model_id and p.calculation_status='CALCULATED' order by calculated_at desc limit 1;
  if not found then raise exception '선택 가능한 성능 결과가 없습니다.' using errcode = 'P0002'; end if;
  select metric into v_metric from core.backtest_run where backtest_run_id = v_perf.run_id;
  select * into v_previous from core.champion_model where item_id=p_item_id order by selected_at desc limit 1;
  insert into core.champion_model(item_id, champion_model_id, model_version, champion_metric, champion_metric_value, wape, mape, bias, rmse, candidate_performance, selection_reason, selection_method, selected_by, backtest_run_id)
  values (v_perf.item_id, v_perf.model_id, v_perf.model_version, v_metric, case v_metric when 'MAPE' then v_perf.mape when 'RMSE' then v_perf.rmse when 'MAE' then v_perf.mae else v_perf.wape end, v_perf.wape, v_perf.mape, v_perf.bias, v_perf.rmse, (select jsonb_agg(to_jsonb(q)) from core.model_performance q where q.run_id=v_perf.run_id and q.item_id=p_item_id), p_reason, 'MANUAL', auth.uid(), v_perf.run_id) returning champion_id into v_new;
  insert into core.audit_log(actor, action, target_type, target_id, before, after) values (auth.uid(), 'CHAMPION_MANUALLY_CHANGED', 'champion_model', p_item_id, case when v_previous.champion_id is null then null else to_jsonb(v_previous) end, (select to_jsonb(c) from core.champion_model c where c.champion_id=v_new));
  return v_new;
end;
$$;

create or replace view analytics.v_backtest_run as select * from core.backtest_run;
create or replace view analytics.v_model_performance as select * from core.model_performance;
create or replace view analytics.v_champion_model as
select distinct on (item_id) * from core.champion_model order by item_id, selected_at desc;
create or replace view analytics.v_model_comparison as
select r.run_id, r.model_id, r.item_id, r.period, r.model_version, r.p50, r.p80, r.p90, r.sigma, r.basis, a.actual_qty, a.actual_date
from core.forecast_result r left join core.v_test_actual a on a.item_id=r.item_id and a.actual_date=r.period;

alter table core.backtest_run enable row level security;
alter table core.model_performance enable row level security;
alter table core.champion_model enable row level security;
revoke all on core.backtest_run, core.model_performance, core.champion_model from anon;
grant select on analytics.v_backtest_run, analytics.v_model_performance, analytics.v_champion_model, analytics.v_model_comparison to authenticated;
revoke execute on function core.run_backtest(uuid), core.set_manual_champion(text, text, text) from public, anon;
grant execute on function core.run_backtest(uuid), core.set_manual_champion(text, text, text) to authenticated;
drop policy if exists backtest_run_select on core.backtest_run;
create policy backtest_run_select on core.backtest_run for select to authenticated using (core.is_active_user());
drop policy if exists model_performance_select on core.model_performance;
create policy model_performance_select on core.model_performance for select to authenticated using (core.is_active_user());
drop policy if exists champion_model_select on core.champion_model;
create policy champion_model_select on core.champion_model for select to authenticated using (core.is_active_user());
