create schema if not exists analytics;

create or replace view core.v_train_period_grid as
with setting as (
  select train_start, train_end, granularity
  from core.forecast_setting
  where active = true
  limit 1
), periods as (
  select
    case s.granularity
      when 'DAY' then d::date
      when 'WEEK' then date_trunc('week', d)::date
      else date_trunc('month', d)::date
    end as period_start
  from setting s
  cross join lateral generate_series(
    case s.granularity when 'DAY' then s.train_start else date_trunc(case when s.granularity = 'WEEK' then 'week' else 'month' end, s.train_start)::date end,
    case s.granularity when 'DAY' then s.train_end else date_trunc(case when s.granularity = 'WEEK' then 'week' else 'month' end, s.train_end)::date end,
    interval '1 day'
  ) d
  group by 1
), items as (
  select item_id, item_name
  from core.v_item_master
), demand as (
  select item_id, case when (select granularity from setting) = 'DAY' then demand_date when (select granularity from setting) = 'WEEK' then date_trunc('week', demand_date)::date else date_trunc('month', demand_date)::date end as period_start, sum(demand_qty) as quantity, count(*) as source_row_count
  from core.v_train_demand
  group by item_id, 2
)
select
  i.item_id,
  i.item_name,
  p.period_start,
  case when d.source_row_count is null then 0 else d.quantity end as quantity,
  coalesce(d.source_row_count, 0) as source_row_count,
  case when d.source_row_count is null then true else false end as is_grid_zero
from items i
cross join periods p
left join demand d on d.item_id = i.item_id and d.period_start = p.period_start;

create or replace view core.v_sku_demand_period as
select
  item_id,
  item_name,
  period_start,
  quantity,
  source_row_count,
  is_grid_zero,
  row_number() over (partition by item_id order by period_start) as period_index,
  count(*) over (partition by item_id) as n_periods
from core.v_train_period_grid;

create or replace view analytics.v_sku_demand_profile as
with base as (
  select * from core.v_sku_demand_period
), summary as (
  select
    item_id,
    max(item_name) as item_name,
    count(*)::integer as n_periods,
    count(*) filter (where quantity > 0)::integer as n_nonzero_periods,
    count(*) filter (where quantity = 0)::integer as n_zero_periods,
    avg(quantity) filter (where quantity > 0) as positive_mean,
    stddev_samp(quantity) filter (where quantity > 0) as positive_sd,
    avg(quantity) as all_period_mean,
    regr_slope(quantity, period_index) as trend,
    min(period_start) as first_period,
    max(period_start) as last_period
  from base
  group by item_id
), metrics as (
  select
    s.*,
    s.n_periods::numeric / nullif(s.n_nonzero_periods, 0) as adi,
    s.positive_sd / nullif(s.positive_mean, 0) as cv,
    (s.positive_sd / nullif(s.positive_mean, 0)) ^ 2 as cv_squared
  from summary s
), recent as (
  select
    item_id,
    avg(quantity) filter (where period_index > n_periods - 3) as recent_mean,
    avg(quantity) filter (where period_index > n_periods - 6 and period_index <= n_periods - 3) as previous_mean,
    count(*) filter (where period_index > n_periods - 6 and period_index <= n_periods - 3) as previous_count
  from base
  group by item_id
), peak as (
  select distinct on (item_id) item_id, period_start as peak_period
  from base
  order by item_id, quantity desc nulls last, period_start asc
)
select
  m.item_id,
  m.item_name,
  m.n_periods,
  m.n_nonzero_periods,
  m.adi,
  m.cv,
  m.cv_squared,
  m.n_zero_periods::numeric / nullif(m.n_periods, 0) as zero_demand_rate,
  m.trend,
  case when r.previous_count = 3 and r.previous_mean <> 0 then (r.recent_mean - r.previous_mean) / abs(r.previous_mean) else null end as recent_change_rate,
  p.peak_period,
  case when m.adi is null or m.cv_squared is null then null when m.adi < 1.32 and m.cv_squared < 0.49 then 'SMOOTH' when m.adi >= 1.32 and m.cv_squared < 0.49 then 'INTERMITTENT' when m.adi < 1.32 and m.cv_squared >= 0.49 then 'ERRATIC' else 'LUMPY' end as demand_type,
  case when m.n_periods < 24 then null else 'AVAILABLE_FOR_CHECK' end as seasonality,
  case when m.n_nonzero_periods = 0 then 'NO_NONZERO_DEMAND' when m.n_periods < 24 then 'INSUFFICIENT_PERIODS' when m.cv_squared is null then 'NO_VARIABILITY' when m.trend is null then 'INSUFFICIENT_TREND_PERIODS' else null end as reason_code,
  case when m.n_nonzero_periods = 0 or m.cv_squared is null then 'CALCULATION_UNAVAILABLE' when m.cv_squared < 0.49 then 'STABLE' else 'VARIABLE' end as stability
from metrics m
join recent r using (item_id)
join peak p using (item_id);

create or replace view analytics.v_demand_profile_kpi as
select
  count(*)::integer as total_items,
  count(*) filter (where demand_type = 'SMOOTH')::integer as n_smooth,
  count(*) filter (where demand_type = 'INTERMITTENT')::integer as n_intermittent,
  count(*) filter (where demand_type = 'ERRATIC')::integer as n_erratic,
  count(*) filter (where demand_type = 'LUMPY')::integer as n_lumpy,
  count(*) filter (where demand_type in ('INTERMITTENT', 'LUMPY'))::integer as n_croston_needed,
  count(*) filter (where demand_type is null)::integer as n_calculation_unavailable
from analytics.v_sku_demand_profile;

grant usage on schema analytics, core to authenticated;
grant select on core.v_train_period_grid, core.v_sku_demand_period, core.v_supplier_master, analytics.v_sku_demand_profile, analytics.v_demand_profile_kpi to authenticated;
revoke all on analytics.v_sku_demand_profile, analytics.v_demand_profile_kpi from anon;
