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
