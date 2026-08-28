'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/analysis/leadtime', label: '리드타임 격차' },
  { href: '/analysis/stockout', label: '재고 소진 위험' },
  { href: '/analysis/demand-profile', label: 'SKU 수요 패턴' },
] as const;

export default function AnalysisTabs() {
  const pathname = usePathname();

  return (
    <nav className="analysis-tabs" aria-label="분석 화면">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`analysis-tab ${pathname === tab.href ? 'active' : ''}`}
          aria-current={pathname === tab.href ? 'page' : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
