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
