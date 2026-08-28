import type { ReactNode } from 'react';
import type { Status } from './badge';
import Badge from './badge';

export default function AlertRow({ status, title, children }: { status: Status; title: string; children?: ReactNode }) {
  return <div className={`alert-row alert-${status.toLowerCase()}`}><Badge status={status} /><div><strong>{title}</strong>{children && <span>{children}</span>}</div></div>;
}
