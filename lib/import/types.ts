export type ImportType = 'usage_history' | 'inventory' | 'item_master' | 'supplier_master' | 'purchase_order' | 'goods_receipt' | 'sales_order' | 'business_event';
export type ImportMode = 'append' | 'upsert' | 'replace';
export type ValidationSeverity = 'SUCCESS' | 'WARNING' | 'ERROR';
export type RawRow = Record<string, string | number | boolean | null | undefined>;
export type ValidationError = { rowNumber: number; fieldName: string | null; errorCode: string; errorMessage: string; severity: 'WARNING' | 'ERROR'; originalValue: unknown };
export type ValidationResult = { rows: RawRow[]; errors: ValidationError[]; summary: { totalRows: number; successRows: number; warningRows: number; errorRows: number } };
