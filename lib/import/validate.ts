import { getImportDefinition } from './schema.ts';
import type { ImportType, RawRow, ValidationError, ValidationResult } from './types';

type ValidationContext = { itemIds: Set<string>; supplierIds: Set<string> };
const empty = (value: unknown) => value === null || value === undefined || String(value).trim() === '';
const validDate = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

export function validateRows(type: ImportType, inputRows: RawRow[], context: ValidationContext): ValidationResult {
  const definition = getImportDefinition(type);
  if (!definition) throw new Error('UNSUPPORTED_IMPORT_TYPE');
  const errors: ValidationError[] = [];
  const seen = new Set<string>();
  inputRows.forEach((row, index) => {
    const rowNumber = index + 2;
    for (const field of definition.required) if (empty(row[field])) errors.push({ rowNumber, fieldName: field, errorCode: 'REQUIRED', errorMessage: `${field} 필수값이 없습니다.`, severity: 'ERROR', originalValue: row[field] });
    for (const field of definition.dateFields) if (!empty(row[field]) && !validDate(row[field])) errors.push({ rowNumber, fieldName: field, errorCode: 'INVALID_DATE', errorMessage: `${field} 날짜 형식이 올바르지 않습니다.`, severity: 'ERROR', originalValue: row[field] });
    for (const field of definition.numberFields) if (!empty(row[field]) && (typeof row[field] === 'boolean' || Number.isNaN(Number(row[field])))) errors.push({ rowNumber, fieldName: field, errorCode: 'INVALID_NUMBER', errorMessage: `${field} 숫자 형식이 올바르지 않습니다.`, severity: 'ERROR', originalValue: row[field] });
    for (const field of definition.numberFields) if (!empty(row[field]) && Number(row[field]) < 0) errors.push({ rowNumber, fieldName: field, errorCode: 'NEGATIVE_VALUE', errorMessage: `${field} 음수는 허용되지 않습니다.`, severity: 'WARNING', originalValue: row[field] });
    const key = definition.keyFields.map((field) => String(row[field] ?? '')).join('|');
    if (key !== '|' && seen.has(key)) errors.push({ rowNumber, fieldName: definition.keyFields.join(','), errorCode: 'DUPLICATE', errorMessage: '파일 안에 중복된 키가 있습니다.', severity: 'ERROR', originalValue: key });
    if (key !== '|') seen.add(key);
    if (['usage_history', 'inventory', 'item_master', 'purchase_order', 'goods_receipt', 'sales_order'].includes(type) && !empty(row.item_id) && !context.itemIds.has(String(row.item_id).trim())) errors.push({ rowNumber, fieldName: 'item_id', errorCode: 'UNKNOWN_ITEM', errorMessage: '품목 마스터에 존재하지 않는 품목입니다.', severity: 'ERROR', originalValue: row.item_id });
    if (['purchase_order', 'goods_receipt'].includes(type) && !empty(row.supplier_id) && !context.supplierIds.has(String(row.supplier_id).trim())) errors.push({ rowNumber, fieldName: 'supplier_id', errorCode: 'UNKNOWN_SUPPLIER', errorMessage: '공급처 마스터에 존재하지 않는 공급처입니다.', severity: 'ERROR', originalValue: row.supplier_id });
  });
  const errorRows = new Set(errors.filter((error) => error.severity === 'ERROR').map((error) => error.rowNumber));
  const warningRows = new Set(errors.filter((error) => error.severity === 'WARNING').map((error) => error.rowNumber));
  return { rows: inputRows, errors, summary: { totalRows: inputRows.length, successRows: inputRows.length - errorRows.size - warningRows.size, warningRows: warningRows.size, errorRows: errorRows.size } };
}
