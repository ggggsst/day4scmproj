import type { ReactNode } from 'react';
import EmptyValue from './empty-value';

export type DataColumn<T> = { key: string; label: string; align?: 'left' | 'right' | 'center'; render?: (row: T) => ReactNode };

export function formatNumber(value: number | null, suffix = '') {
  if (value === null) return null;
  return `${Number.isInteger(value) ? value : value.toFixed(1)}${suffix}`;
}

export default function DataTable<T extends object>({ columns, rows, empty = '표시할 데이터가 없습니다.', rowKey }: { columns: DataColumn<T>[]; rows: T[]; empty?: string; rowKey?: (row: T, index: number) => string }) {
  if (rows.length === 0) return <p className="empty-state">{empty}</p>;
  return <div className="data-table-wrap"><table className="data-table"><thead><tr>{columns.map((column) => <th key={column.key} style={column.align ? { textAlign: column.align } : undefined}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={rowKey ? rowKey(row, index) : String(index)}>{columns.map((column) => <td key={column.key} style={column.align ? { textAlign: column.align } : undefined}>{column.render ? column.render(row) : <EmptyValue value={(row as Record<string, unknown>)[column.key] as ReactNode} />}</td>)}</tr>)}</tbody></table></div>;
}
