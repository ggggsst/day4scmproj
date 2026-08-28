export type LeadtimeGap = {
  supplier: string;
  country: string;
  masterLeadTime: number | null;
  sampleCount: number;
  actualAverage: number | null;
  p80: number | null;
  gap: number | null;
};

export type StockoutRisk = {
  itemId: string;
  itemName: string;
  supplierId: string;
  currentStock: number | null;
  inboundQty: number | null;
  availableQty: number | null;
  dailyUsageAvg: number | null;
  cv: number | null;
  plannedLeadTime: number | null;
  stockoutDays: number | null;
  stockoutDate: string | null;
  riskStatus: 'SAFE' | 'CRITICAL' | 'UNKNOWN';
  reason: 'NO_USAGE' | 'NO_LEADTIME' | null;
};

export type StockoutKpi = {
  itemCount: number;
  criticalCount: number;
  safeCount: number;
  unknownCount: number;
  within30DaysCount: number;
  averageStockoutDays: number | null;
};

export type ForecastDataCoverage = {
  dataStart: string | null;
  dataEnd: string | null;
  trainStart: string | null;
  trainEnd: string | null;
  testStart: string | null;
  testEnd: string | null;
  granularity: string | null;
  trainRowCount: number;
  testRowCount: number;
  trainWindowOk: boolean;
  testWindowOk: boolean;
  dataIsolationOk: boolean;
};

export type ForecastSetting = {
  settingId: string;
  trainStart: string;
  trainEnd: string;
  testStart: string;
  testEnd: string;
  granularity: string;
  active: boolean;
};

export type PolicyConfig = { policyKey: string; policyValue: unknown; valueType: string; description: string | null; active: boolean };
export type OutlierRule = { ruleCode: string; ruleName: string; conditionType: string; conditionValue: unknown; excludeFromTraining: boolean; active: boolean };
export type ItemPolicy = { itemId: string; moq: number | null; packSize: number | null; itemGrade: string | null; serviceLevel: number | null };
export type DemandType = 'SMOOTH' | 'INTERMITTENT' | 'ERRATIC' | 'LUMPY';
export type DemandProfile = { itemId: string; itemName: string | null; nPeriods: number; nNonzeroPeriods: number; adi: number | null; cv: number | null; cvSquared: number | null; zeroDemandRate: number | null; trend: number | null; recentChangeRate: number | null; peakPeriod: string | null; demandType: DemandType | null; seasonality: string | null; reasonCode: string | null; stability: string | null };
export type DemandProfileKpi = { totalItems: number; smooth: number; intermittent: number; erratic: number; lumpy: number; crostonNeeded: number; calculationUnavailable: number };

function value(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
  }
  return null;
}

function numberValue(row: Record<string, unknown>, keys: string[]) {
  const raw = value(row, keys);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeLeadtimeGap(row: Record<string, unknown>): LeadtimeGap {
  return {
    supplier: String(value(row, ['supplier_name', 'supplier', '법인', '공급처', '공급업체명']) ?? '미정'),
    country: String(value(row, ['country', '국가']) ?? '미정'),
    masterLeadTime: numberValue(row, ['std_lead_time', 'master_lt', 'master_lead_time', 'planned_lead_time', '표준리드타임', '표준리드타임(일)', '마스터값']),
    sampleCount: numberValue(row, ['n_samples', 'sample_count', 'samples', '표본수']) ?? 0,
    actualAverage: numberValue(row, ['mean_days', 'actual_avg', 'actual_average', 'avg_lead_time', '실적평균']),
    p80: numberValue(row, ['p80_days', 'p80', 'P80']),
    gap: numberValue(row, ['gap_days', 'gap', 'leadtime_gap', '격차']),
  };
}

function normalizeRiskStatus(raw: unknown): StockoutRisk['riskStatus'] {
  if (raw === 'SAFE' || raw === 'CRITICAL') return raw;
  return 'UNKNOWN';
}

function normalizeReason(raw: unknown): StockoutRisk['reason'] {
  if (raw === 'NO_USAGE' || raw === 'NO_LEADTIME') return raw;
  return null;
}

export function normalizeStockoutRisk(row: Record<string, unknown>): StockoutRisk {
  const rawDate = value(row, ['stockout_date', 'stockoutDate', '소진예정일']);

  return {
    itemId: String(value(row, ['item_id', 'itemId', '품목코드']) ?? '미정'),
    itemName: String(value(row, ['item_name', 'itemName', '품목명']) ?? '미정'),
    supplierId: String(value(row, ['supplier_id', 'supplierId', '공급처코드', '생산법인']) ?? '미정'),
    currentStock: numberValue(row, ['current_stock', 'currentStock', '현재고']),
    inboundQty: numberValue(row, ['inbound_qty', 'inboundQty', '입고예정']),
    availableQty: numberValue(row, ['available_qty', 'availableQty', '가용수량']),
    dailyUsageAvg: numberValue(row, ['daily_usage_avg', 'dailyUsageAvg', '일평균사용량']),
    cv: numberValue(row, ['cv', '변동계수']),
    plannedLeadTime: numberValue(row, ['planned_lead_time', 'plannedLeadTime', '계획리드타임']),
    stockoutDays: numberValue(row, ['stockout_days', 'stockoutDays', '소진일수']),
    stockoutDate: rawDate === null ? null : String(rawDate),
    riskStatus: normalizeRiskStatus(value(row, ['risk_status', 'riskStatus', '위험상태'])),
    reason: normalizeReason(value(row, ['reason', '사유'])),
  };
}

export function normalizeStockoutKpi(row: Record<string, unknown>): StockoutKpi {
  return {
    itemCount: numberValue(row, ['n_items', 'itemCount', '품목수']) ?? 0,
    criticalCount: numberValue(row, ['n_critical', 'criticalCount', '위험품목수']) ?? 0,
    safeCount: numberValue(row, ['n_safe', 'safeCount', '안전품목수']) ?? 0,
    unknownCount: numberValue(row, ['n_unknown', 'unknownCount', '판정불가수']) ?? 0,
    within30DaysCount: numberValue(row, ['n_within_30d', 'within30DaysCount', '30일이내소진수']) ?? 0,
    averageStockoutDays: numberValue(row, ['avg_stockout_days', 'averageStockoutDays', '평균소진일수']),
  };
}

export function normalizeForecastDataCoverage(row: Record<string, unknown>): ForecastDataCoverage {
  return {
    dataStart: value(row, ['data_start', 'dataStart']) as string | null,
    dataEnd: value(row, ['data_end', 'dataEnd']) as string | null,
    trainStart: value(row, ['train_start', 'trainStart']) as string | null,
    trainEnd: value(row, ['train_end', 'trainEnd']) as string | null,
    testStart: value(row, ['test_start', 'testStart']) as string | null,
    testEnd: value(row, ['test_end', 'testEnd']) as string | null,
    granularity: value(row, ['granularity']) as string | null,
    trainRowCount: numberValue(row, ['train_row_count', 'trainRowCount']) ?? 0,
    testRowCount: numberValue(row, ['test_row_count', 'testRowCount']) ?? 0,
    trainWindowOk: row.train_window_ok === true,
    testWindowOk: row.test_window_ok === true,
    dataIsolationOk: row.data_isolation_ok === true,
  };
}

export function normalizeForecastSetting(row: Record<string, unknown>): ForecastSetting {
  return {
    settingId: String(value(row, ['setting_id']) ?? ''),
    trainStart: String(value(row, ['train_start']) ?? ''),
    trainEnd: String(value(row, ['train_end']) ?? ''),
    testStart: String(value(row, ['test_start']) ?? ''),
    testEnd: String(value(row, ['test_end']) ?? ''),
    granularity: String(value(row, ['granularity']) ?? ''),
    active: row.active === true,
  };
}

export function normalizePolicyConfig(row: Record<string, unknown>): PolicyConfig {
  return { policyKey: String(value(row, ['policy_key']) ?? ''), policyValue: row.policy_value ?? null, valueType: String(value(row, ['value_type']) ?? ''), description: value(row, ['description']) as string | null, active: row.active === true };
}

export function normalizeOutlierRule(row: Record<string, unknown>): OutlierRule {
  return { ruleCode: String(value(row, ['rule_code']) ?? ''), ruleName: String(value(row, ['rule_name']) ?? ''), conditionType: String(value(row, ['condition_type']) ?? ''), conditionValue: row.condition_value ?? null, excludeFromTraining: row.exclude_from_training === true, active: row.active === true };
}

export function normalizeItemPolicy(row: Record<string, unknown>): ItemPolicy {
  return { itemId: String(value(row, ['item_id']) ?? ''), moq: numberValue(row, ['moq']), packSize: numberValue(row, ['pack_size']), itemGrade: value(row, ['item_grade']) as string | null, serviceLevel: numberValue(row, ['service_level']) };
}

function normalizeDemandType(value: unknown): DemandType | null { return value === 'SMOOTH' || value === 'INTERMITTENT' || value === 'ERRATIC' || value === 'LUMPY' ? value : null; }

export function normalizeDemandProfile(row: Record<string, unknown>): DemandProfile {
  return { itemId: String(value(row, ['item_id']) ?? ''), itemName: value(row, ['item_name']) as string | null, nPeriods: numberValue(row, ['n_periods']) ?? 0, nNonzeroPeriods: numberValue(row, ['n_nonzero_periods']) ?? 0, adi: numberValue(row, ['adi']), cv: numberValue(row, ['cv']), cvSquared: numberValue(row, ['cv_squared']), zeroDemandRate: numberValue(row, ['zero_demand_rate']), trend: numberValue(row, ['trend']), recentChangeRate: numberValue(row, ['recent_change_rate']), peakPeriod: value(row, ['peak_period']) as string | null, demandType: normalizeDemandType(value(row, ['demand_type'])), seasonality: value(row, ['seasonality']) as string | null, reasonCode: value(row, ['reason_code']) as string | null, stability: value(row, ['stability']) as string | null };
}

export function normalizeDemandProfileKpi(row: Record<string, unknown>): DemandProfileKpi {
  return { totalItems: numberValue(row, ['total_items']) ?? 0, smooth: numberValue(row, ['n_smooth']) ?? 0, intermittent: numberValue(row, ['n_intermittent']) ?? 0, erratic: numberValue(row, ['n_erratic']) ?? 0, lumpy: numberValue(row, ['n_lumpy']) ?? 0, crostonNeeded: numberValue(row, ['n_croston_needed']) ?? 0, calculationUnavailable: numberValue(row, ['n_calculation_unavailable']) ?? 0 };
}

export type ForecastModel = { modelId: string; modelName: string; family: string; engine: string; version: string; enabled: boolean; isDefault: boolean; applicableDemandType: string[]; parameters: Record<string, unknown>; description: string | null; updatedAt: string | null };
export type ForecastRun = { runId: string; status: 'RUNNING' | 'SUCCESS' | 'FAILED'; granularity: string; trainStart: string | null; trainEnd: string | null; horizon: number | null; championMetric: string | null; dataSnapshotAt: string | null; models: string[]; nModels: number; nItems: number; nRows: number; startedAt: string | null; finishedAt: string | null; durationMs: number | null; triggeredEmail: string | null; note: string | null; message: string | null; isStale: boolean };
export type ForecastResult = { runId: string; modelId: string; itemId: string; period: string; modelVersion: string; predictedQty: number | null; p50: number | null; p80: number | null; p90: number | null; sigma: number | null; basis: string };

function jsonValue(row: Record<string, unknown>, key: string): Record<string, unknown> { return row[key] && typeof row[key] === 'object' && !Array.isArray(row[key]) ? row[key] as Record<string, unknown> : {}; }
function stringArray(row: Record<string, unknown>, key: string): string[] { return Array.isArray(row[key]) ? row[key].filter((value): value is string => typeof value === 'string') : []; }

export function normalizeForecastModel(row: Record<string, unknown>): ForecastModel {
  return { modelId: String(value(row, ['model_id']) ?? ''), modelName: String(value(row, ['model_name']) ?? ''), family: String(value(row, ['family']) ?? ''), engine: String(value(row, ['engine']) ?? ''), version: String(value(row, ['version']) ?? ''), enabled: row.enabled === true, isDefault: row.is_default === true, applicableDemandType: stringArray(row, 'applicable_demand_type'), parameters: jsonValue(row, 'parameters'), description: value(row, ['description']) as string | null, updatedAt: value(row, ['updated_at']) as string | null };
}

export function normalizeForecastRun(row: Record<string, unknown>): ForecastRun {
  const status = value(row, ['status']);
  return { runId: String(value(row, ['run_id']) ?? ''), status: status === 'RUNNING' || status === 'SUCCESS' || status === 'FAILED' ? status : 'FAILED', granularity: String(value(row, ['granularity']) ?? ''), trainStart: value(row, ['train_start']) as string | null, trainEnd: value(row, ['train_end']) as string | null, horizon: numberValue(row, ['horizon']), championMetric: value(row, ['champion_metric']) as string | null, dataSnapshotAt: value(row, ['data_snapshot_at']) as string | null, models: stringArray(row, 'models'), nModels: numberValue(row, ['n_models']) ?? 0, nItems: numberValue(row, ['n_items']) ?? 0, nRows: numberValue(row, ['n_rows']) ?? 0, startedAt: value(row, ['started_at']) as string | null, finishedAt: value(row, ['finished_at']) as string | null, durationMs: numberValue(row, ['duration_ms']), triggeredEmail: value(row, ['triggered_email']) as string | null, note: value(row, ['note']) as string | null, message: value(row, ['message']) as string | null, isStale: row.is_stale === true };
}

export function normalizeForecastResult(row: Record<string, unknown>): ForecastResult {
  return { runId: String(value(row, ['run_id']) ?? ''), modelId: String(value(row, ['model_id']) ?? ''), itemId: String(value(row, ['item_id']) ?? ''), period: String(value(row, ['period']) ?? ''), modelVersion: String(value(row, ['model_version']) ?? ''), predictedQty: numberValue(row, ['predicted_qty']), p50: numberValue(row, ['p50']), p80: numberValue(row, ['p80']), p90: numberValue(row, ['p90']), sigma: numberValue(row, ['sigma']), basis: String(value(row, ['basis']) ?? 'CALCULATION_UNAVAILABLE') };
}

export type ModelPerformance = { runId: string; modelId: string; modelVersion: string; itemId: string; nPeriods: number; wape: number | null; mape: number | null; bias: number | null; rmse: number | null; mae: number | null; baselineImprovement: number | null; rank: number | null; calculationStatus: string; reasonCode: string | null };
export type ChampionModel = { itemId: string; championModelId: string | null; modelVersion: string | null; championMetric: string; championMetricValue: number | null; wape: number | null; mape: number | null; bias: number | null; rmse: number | null; candidatePerformance: unknown[]; selectionReason: string | null; selectionMethod: 'AUTO' | 'MANUAL'; selectedAt: string | null };
export type ModelComparisonRow = ForecastResult & { actualQty: number | null; actualDate: string | null };

export function normalizeModelPerformance(row: Record<string, unknown>): ModelPerformance {
  const rank = numberValue(row, ['rank']);
  return { runId: String(value(row, ['run_id']) ?? ''), modelId: String(value(row, ['model_id']) ?? ''), modelVersion: String(value(row, ['model_version']) ?? ''), itemId: String(value(row, ['item_id']) ?? ''), nPeriods: numberValue(row, ['n_periods']) ?? 0, wape: numberValue(row, ['wape']), mape: numberValue(row, ['mape']), bias: numberValue(row, ['bias']), rmse: numberValue(row, ['rmse']), mae: numberValue(row, ['mae']), baselineImprovement: numberValue(row, ['baseline_improvement']), rank: rank === null ? null : Math.trunc(rank), calculationStatus: String(value(row, ['calculation_status']) ?? 'CALCULATION_UNAVAILABLE'), reasonCode: value(row, ['reason_code']) as string | null };
}

export function normalizeChampionModel(row: Record<string, unknown>): ChampionModel {
  const method = value(row, ['selection_method']);
  return { itemId: String(value(row, ['item_id']) ?? ''), championModelId: value(row, ['champion_model_id']) as string | null, modelVersion: value(row, ['model_version']) as string | null, championMetric: String(value(row, ['champion_metric']) ?? ''), championMetricValue: numberValue(row, ['champion_metric_value']), wape: numberValue(row, ['wape']), mape: numberValue(row, ['mape']), bias: numberValue(row, ['bias']), rmse: numberValue(row, ['rmse']), candidatePerformance: Array.isArray(row.candidate_performance) ? row.candidate_performance : [], selectionReason: value(row, ['selection_reason']) as string | null, selectionMethod: method === 'MANUAL' ? 'MANUAL' : 'AUTO', selectedAt: value(row, ['selected_at']) as string | null };
}

export function normalizeModelComparison(row: Record<string, unknown>): ModelComparisonRow {
  return { ...normalizeForecastResult(row), actualQty: numberValue(row, ['actual_qty']), actualDate: value(row, ['actual_date']) as string | null };
}
