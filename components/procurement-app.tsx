'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, Boxes, Check, ChevronLeft, ChevronRight, CircleDollarSign, ClipboardCheck, FileSpreadsheet, FileText, Gauge, Layers3, PackageCheck, Settings2, ShoppingCart, Upload, Workflow, Wrench } from 'lucide-react';
import Sidebar from '@/components/shell/sidebar';
import Topbar from '@/components/shell/topbar';
import DashboardStep from '@/components/workflow/dashboard-step';
import DemandStep from '@/components/workflow/demand-step';
import SupplyStep from '@/components/workflow/supply-step';
import MasterStep from '@/components/workflow/master-step';
import CalculationStep from '@/components/workflow/calculation-step';
import ReportStep from '@/components/workflow/report-step';
import { USER_MENU, type MenuItem, type WorkflowStepId } from '@/lib/menu';

export type StepId = WorkflowStepId;

const steps = USER_MENU.filter((item): item is MenuItem & { step: StepId; short: string; kicker: string } => item.kind === 'workflow' && Boolean(item.step));

export default function ProcurementApp() {
  const [active, setActive] = useState<StepId>('dashboard');
  const currentIndex = steps.findIndex((step) => step.step === active);
  const current = steps[currentIndex];
  const completedCount = Math.max(0, currentIndex);
  const navigate = (index: number) => setActive(steps[Math.max(0, Math.min(index, steps.length - 1))].step);
  const goNext = () => navigate(currentIndex + 1);
  const goBack = () => navigate(currentIndex - 1);

  const page = useMemo(() => {
    const props = { onNext: goNext, onBack: goBack };
    switch (active) {
      case 'demand': return <DemandStep {...props} />;
      case 'supply': return <SupplyStep {...props} />;
      case 'master': return <MasterStep {...props} />;
      case 'calculation': return <CalculationStep {...props} />;
      case 'report': return <ReportStep {...props} />;
      default: return <DashboardStep onStart={goNext} onOpenStep={setActive} />;
    }
  }, [active]);

  return (
    <div className="app-shell">
      <Sidebar activeStep={active} onWorkflowSelect={setActive} />
      <main className="main">
        <Topbar title={current.label} />
        <div className="content">
          <div className="progress-wrap">
            <div className="progress-track">
              {steps.map((step, index) => <div key={step.id} className="progress-step-wrap" style={{ display: 'contents' }}>
                <button className={`progress-step ${index === currentIndex ? 'active' : ''} ${index < currentIndex ? 'done' : ''}`} onClick={() => navigate(index)}>
                  <span className="progress-kicker">{step.kicker}</span>
                  <span className="progress-dot">{index < currentIndex ? <Check size={12} strokeWidth={3} /> : index + 1}</span>
                  <span className="progress-label">{step.label}</span>
                </button>
                {index < steps.length - 1 && <span className="progress-line" />}
              </div>)}
            </div>
            <div className="progress-caption"><span>전체 업무 플로우</span><span>{completedCount} / {steps.length - 1} 단계 진행</span></div>
          </div>
          {page}
        </div>
      </main>
    </div>
  );
}

export const Icons = { AlertTriangle, ClipboardCheck, CircleDollarSign, FileSpreadsheet, Layers3, PackageCheck, Upload, Workflow, Wrench };
