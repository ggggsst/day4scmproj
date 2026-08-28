import type { ReactNode } from 'react';

export default function Panel({ title, description, children, className = '' }: { title?: string; description?: string; children: ReactNode; className?: string }) {
  return <section className={`ui-panel ${className}`}><div className="panel-heading">{title && <div><h3>{title}</h3>{description && <span>{description}</span>}</div>}</div>{children}</section>;
}
