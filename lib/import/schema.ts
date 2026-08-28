import type { ImportType } from './types';

export type ImportDefinition = { type: ImportType; required: string[]; aliases: Record<string, string>; rawFields: Record<string, string>; dateFields: string[]; numberFields: string[]; keyFields: string[] };

const definitions: ImportDefinition[] = [
  { type: 'usage_history', required: ['item_id', 'use_date', 'qty'], rawFields: {}, aliases: { '품목코드': 'item_id', '품목': 'item_id', '출고일': 'use_date', '사용일': 'use_date', '출고수량': 'qty', '수량': 'qty', '창고': 'warehouse' }, dateFields: ['use_date'], numberFields: ['qty'], keyFields: ['usage_id'] },
  { type: 'inventory', required: ['item_id'], rawFields: { item_id: '품목코드', warehouse: '창고', quantity: '현재고', inventory_date: '기준일자', safety_stock: '안전재고' }, aliases: { '품목코드': 'item_id', '현재고': 'quantity', '수량': 'quantity', '창고': 'warehouse', '기준일자': 'inventory_date' }, dateFields: ['inventory_date'], numberFields: ['quantity', 'safety_stock'], keyFields: ['item_id', 'warehouse'] },
  { type: 'item_master', required: ['item_id'], rawFields: { item_id: '품목코드', item_name: '품목명', item_type: '품목구분', unit: '단위', standard_price: '표준단가', is_active: '사용여부' }, aliases: { '품목코드': 'item_id', '품목명': 'item_name' }, dateFields: [], numberFields: [], keyFields: ['item_id'] },
  { type: 'supplier_master', required: ['supplier_id'], rawFields: { supplier_id: '공급업체코드', supplier_name: '공급업체명', country: '국가', standard_lead_time: '표준리드타임(일)', manager: '담당자', is_active: '사용여부' }, aliases: { '공급처코드': 'supplier_id', '공급처명': 'supplier_name', '법인': 'supplier_name' }, dateFields: [], numberFields: [], keyFields: ['supplier_id'] },
  { type: 'purchase_order', required: ['po_id', 'item_id'], rawFields: { po_id: '발주번호', order_date: '발주일', supplier_id: '공급업체', item_id: '품목코드', quantity: '발주수량', unit_price: '단가', requested_date: '납기예정일', buyer: '발주담당' }, aliases: { '발주번호': 'po_id', '품목코드': 'item_id', '발주일': 'order_date', '수량': 'quantity' }, dateFields: ['order_date', 'requested_date'], numberFields: ['quantity', 'unit_price'], keyFields: ['po_id'] },
  { type: 'goods_receipt', required: ['item_id'], rawFields: { receipt_id: '입고번호', po_id: '발주번호', item_id: '품목코드', quantity: '입고수량', receipt_date: '입고일', warehouse: '입고창고' }, aliases: { '품목코드': 'item_id', '입고일': 'receipt_date', '입고수량': 'quantity' }, dateFields: ['receipt_date'], numberFields: ['quantity'], keyFields: ['receipt_id'] },
  { type: 'sales_order', required: ['item_id'], rawFields: {}, aliases: { '품목코드': 'item_id', '주문일': 'order_date', '수량': 'quantity', '납기일': 'requested_date' }, dateFields: ['order_date', 'requested_date'], numberFields: ['quantity'], keyFields: ['sales_order_id', 'source_order_id'] },
  { type: 'business_event', required: ['event_type', 'event_date'], rawFields: {}, aliases: { '이벤트유형': 'event_type', '이벤트일': 'event_date', '품목코드': 'item_id', '수량': 'quantity' }, dateFields: ['event_date'], numberFields: ['quantity'], keyFields: ['event_id'] },
];

export function getImportDefinition(type: string): ImportDefinition | null { return definitions.find((definition) => definition.type === type) ?? null; }
export function listImportDefinitions() { return definitions; }
export function mapHeaders(headers: string[], definition: ImportDefinition) {
  return Object.fromEntries(headers.map((header) => [header, definition.aliases[header] ?? header.trim().toLowerCase()]));
}
