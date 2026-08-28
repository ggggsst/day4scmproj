'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Boxes, FileText, Gauge, PackageCheck, Settings2, ShoppingCart, SlidersHorizontal, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { USER_MENU, type MenuIcon, type WorkflowStepId } from '@/lib/menu';

const icons: Record<MenuIcon, LucideIcon> = {
  overview: Gauge,
  demand: BarChart3,
  supply: Boxes,
  master: Settings2,
  calculation: ShoppingCart,
  report: FileText,
  leadtime: BarChart3,
  stockout: PackageCheck,
  settings: SlidersHorizontal,
  account: UserRound,
};

export default function Sidebar({ activeStep, onWorkflowSelect }: { activeStep: WorkflowStepId; onWorkflowSelect: (step: WorkflowStepId) => void }) {
  const pathname = usePathname();
  const workflowMenu = USER_MENU.filter((item) => item.kind === 'workflow');
  const analysisMenu = USER_MENU.filter((item) => item.kind === 'analysis');
  const accountMenu = USER_MENU.filter((item) => item.id === 'account');

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">OP</div>
        <div className="brand-copy"><strong>월간 발주계획</strong><span>Procurement Planning</span></div>
      </div>
      <div className="nav-label">WORKFLOW</div>
      <nav className="nav-list" aria-label="업무 단계">
        {workflowMenu.map((item, index) => {
          const Icon = icons[item.icon];
          const isDone = workflowMenu.findIndex((menu) => menu.step === activeStep) > index;
          return <button key={item.id} className={`nav-button ${activeStep === item.step ? 'active' : ''} ${isDone ? 'complete' : ''}`} onClick={() => item.step && onWorkflowSelect(item.step)}>
            <span className="nav-number">{isDone ? '✓' : <Icon size={13} />}</span><span>{item.label}</span>
          </button>;
        })}
      </nav>
      <div className="sidebar-analysis">
        <div className="nav-label">ANALYSIS</div>
        {analysisMenu.map((item) => {
          const Icon = icons[item.icon];
          return <Link key={item.id} href={item.href} className={`nav-button ${pathname === item.href ? 'active' : ''}`}>
            <span className="nav-number"><Icon size={13} /></span><span>{item.label}</span>
          </Link>;
        })}
      </div>
      <div className="sidebar-account">{accountMenu.map((item) => { const Icon = icons[item.icon]; return <Link key={item.id} href={item.href} className={`nav-button ${pathname === item.href ? 'active' : ''}`}><span className="nav-number"><Icon size={13} /></span><span>{item.label}</span></Link>; })}</div>
      <div className="sidebar-foot"><b>월간 발주계획</b><br />운영 계정으로 접속 중입니다.</div>
    </aside>
  );
}
