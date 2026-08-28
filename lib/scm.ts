import { createSupabaseServerClient } from './supabase';
import {
  normalizeLeadtimeGap,
  normalizeStockoutKpi,
  normalizeStockoutRisk,
  normalizeForecastDataCoverage,
  normalizeForecastSetting,
  normalizePolicyConfig,
  normalizeOutlierRule,
  normalizeItemPolicy,
  type LeadtimeGap,
  type StockoutRisk,
  type ForecastDataCoverage,
  type ForecastSetting,
  type PolicyConfig,
  type OutlierRule,
  type ItemPolicy,
  normalizeDemandProfile,
  normalizeDemandProfileKpi,
  type DemandProfile,
  type DemandProfileKpi,
  normalizeForecastModel,
  normalizeForecastRun,
  normalizeForecastResult,
  type ForecastModel,
  type ForecastRun,
  type ForecastResult,
  normalizeModelPerformance,
  normalizeChampionModel,
  normalizeModelComparison,
  type ModelPerformance,
  type ChampionModel,
  type ModelComparisonRow,
} from './scm-model';

export async function getLeadtimeGap(): Promise<{ rows: LeadtimeGap[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.schema('analytics').from('v_leadtime_gap').select('*');
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []).map((row) => normalizeLeadtimeGap(row as Record<string, unknown>)), error: null };
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' };
  }
}

export async function getStockoutKpi() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.schema('analytics').from('v_stockout_kpi').select('*').maybeSingle();
    if (error) return { data: null, error: error.message };
    return { data: data ? normalizeStockoutKpi(data as Record<string, unknown>) : null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' };
  }
}

export async function getStockoutRisk(): Promise<{ rows: StockoutRisk[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.schema('analytics').from('v_stockout_risk').select('*');
    if (error) return { rows: [], error: error.message };
    return {
      rows: (data ?? []).map((row) => normalizeStockoutRisk(row as Record<string, unknown>)),
      error: null,
    };
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' };
  }
}

export async function getForecastSettingsData() {
  try {
    const supabase = await createSupabaseServerClient();
    const [coverage, settings, policies, rules, itemPolicies] = await Promise.all([
      supabase.schema('analytics').from('v_data_coverage').select('*').maybeSingle(),
      supabase.schema('core').from('forecast_setting').select('*').order('created_at', { ascending: false }),
      supabase.schema('core').from('policy_config').select('*').eq('active', true).order('policy_key'),
      supabase.schema('core').from('outlier_rule').select('*').eq('active', true).order('rule_code'),
      supabase.schema('core').from('item_policy').select('*').order('item_id'),
    ]);
    const firstError = [coverage, settings, policies, rules, itemPolicies].find((result) => result.error)?.error;
    if (firstError) return { coverage: null, settings: [], policies: [], rules: [], itemPolicies: [], error: firstError.message };
    return {
      coverage: coverage.data ? normalizeForecastDataCoverage(coverage.data as Record<string, unknown>) : null,
      settings: (settings.data ?? []).map((row) => normalizeForecastSetting(row as Record<string, unknown>)),
      policies: (policies.data ?? []).map((row) => normalizePolicyConfig(row as Record<string, unknown>)),
      rules: (rules.data ?? []).map((row) => normalizeOutlierRule(row as Record<string, unknown>)),
      itemPolicies: (itemPolicies.data ?? []).map((row) => normalizeItemPolicy(row as Record<string, unknown>)),
      error: null,
    } as { coverage: ForecastDataCoverage | null; settings: ForecastSetting[]; policies: PolicyConfig[]; rules: OutlierRule[]; itemPolicies: ItemPolicy[]; error: string | null };
  } catch (error) {
    return { coverage: null, settings: [], policies: [], rules: [], itemPolicies: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' };
  }
}

export async function getDemandProfileData(): Promise<{ rows: DemandProfile[]; kpi: DemandProfileKpi | null; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const [profiles, kpi] = await Promise.all([
      supabase.schema('analytics').from('v_sku_demand_profile').select('*').order('item_id'),
      supabase.schema('analytics').from('v_demand_profile_kpi').select('*').maybeSingle(),
    ]);
    const firstError = profiles.error ?? kpi.error;
    if (firstError) return { rows: [], kpi: null, error: firstError.message };
    return { rows: (profiles.data ?? []).map((row) => normalizeDemandProfile(row as Record<string, unknown>)), kpi: kpi.data ? normalizeDemandProfileKpi(kpi.data as Record<string, unknown>) : null, error: null };
  } catch (error) { return { rows: [], kpi: null, error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' }; }
}

export async function getForecastModels(): Promise<{ rows: ForecastModel[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.schema('analytics').from('v_model_config').select('*').order('model_id');
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []).map((row) => normalizeForecastModel(row as Record<string, unknown>)), error: null };
  } catch (error) { return { rows: [], error: error instanceof Error ? error.message : 'Forecast 모델 조회에 실패했습니다.' }; }
}

export async function getForecastRuns(): Promise<{ rows: ForecastRun[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.schema('analytics').from('v_forecast_run').select('*').order('started_at', { ascending: false });
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []).map((row) => normalizeForecastRun(row as Record<string, unknown>)), error: null };
  } catch (error) { return { rows: [], error: error instanceof Error ? error.message : 'Forecast 실행 이력 조회에 실패했습니다.' }; }
}

export async function getForecastResults(runId: string): Promise<{ rows: ForecastResult[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.schema('analytics').from('v_forecast_result').select('*').eq('run_id', runId).order('item_id').order('period');
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []).map((row) => normalizeForecastResult(row as Record<string, unknown>)), error: null };
  } catch (error) { return { rows: [], error: error instanceof Error ? error.message : 'Forecast 결과 조회에 실패했습니다.' }; }
}

export async function getModelPerformance(runId?: string): Promise<{ rows: ModelPerformance[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    let query = supabase.schema('analytics').from('v_model_performance').select('*').order('item_id').order('rank');
    if (runId) query = query.eq('run_id', runId);
    const { data, error } = await query;
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []).map((row) => normalizeModelPerformance(row as Record<string, unknown>)), error: null };
  } catch (error) { return { rows: [], error: error instanceof Error ? error.message : '모델 성능 조회에 실패했습니다.' }; }
}

export async function getChampions(): Promise<{ rows: ChampionModel[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.schema('analytics').from('v_champion_model').select('*').order('item_id');
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []).map((row) => normalizeChampionModel(row as Record<string, unknown>)), error: null };
  } catch (error) { return { rows: [], error: error instanceof Error ? error.message : 'Champion 조회에 실패했습니다.' }; }
}

export async function getModelComparison(runId?: string): Promise<{ rows: ModelComparisonRow[]; performance: ModelPerformance[]; champions: ChampionModel[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    let comparison = supabase.schema('analytics').from('v_model_comparison').select('*').order('item_id').order('period');
    let performance = supabase.schema('analytics').from('v_model_performance').select('*').order('item_id').order('rank');
    if (runId) { comparison = comparison.eq('run_id', runId); performance = performance.eq('run_id', runId); }
    const [rows, scores, champions] = await Promise.all([comparison, performance, supabase.schema('analytics').from('v_champion_model').select('*').order('item_id')]);
    const firstError = rows.error ?? scores.error ?? champions.error;
    if (firstError) return { rows: [], performance: [], champions: [], error: firstError.message };
    return { rows: (rows.data ?? []).map((row) => normalizeModelComparison(row as Record<string, unknown>)), performance: (scores.data ?? []).map((row) => normalizeModelPerformance(row as Record<string, unknown>)), champions: (champions.data ?? []).map((row) => normalizeChampionModel(row as Record<string, unknown>)), error: null };
  } catch (error) { return { rows: [], performance: [], champions: [], error: error instanceof Error ? error.message : '모델 비교 조회에 실패했습니다.' }; }
}
