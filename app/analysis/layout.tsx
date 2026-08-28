import type { ReactNode } from 'react';
import Link from 'next/link';
import AnalysisTabs from '@/components/analysis/analysis-tabs';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AnalysisLayout({ children }: { children: ReactNode }) {
  await requireUser();
  return (
    <div className="analysis-shell">
      <header className="analysis-topbar">
        <Link href="/" className="analysis-home">← 발주계획</Link>
        <AnalysisTabs />
      </header>
      {children}
    </div>
  );
}
