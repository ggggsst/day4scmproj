import type { ReactNode } from 'react';

export default function EmptyValue({ value, reasonCode }: { value: ReactNode; reasonCode?: string | null }) {
  if (value !== null && value !== undefined && value !== '') return <>{value}</>;
  return <span className="empty-value">—{reasonCode ? ` + ${reasonCode}` : ''}</span>;
}
