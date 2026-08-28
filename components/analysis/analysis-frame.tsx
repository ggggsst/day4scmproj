import type { ReactNode } from 'react';
import PageHeader from '@/components/shell/page-header';

export default function AnalysisFrame({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="analysis-page">
      <PageHeader title={title} description={description} actions={<span className="local-badge">SUPABASE LIVE</span>} />
      {children}
    </section>
  );
}
