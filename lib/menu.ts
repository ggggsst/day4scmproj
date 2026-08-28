export type UserRole = 'USER' | 'ADMIN';
export type WorkflowStepId = 'dashboard' | 'demand' | 'supply' | 'master' | 'calculation' | 'report';
export type MenuIcon = 'overview' | 'demand' | 'supply' | 'master' | 'calculation' | 'report' | 'leadtime' | 'stockout' | 'settings';

export type MenuItem = {
  id: string;
  label: string;
  href: string;
  icon: MenuIcon;
  kind: 'workflow' | 'analysis' | 'admin';
  role: UserRole;
  step?: WorkflowStepId;
  short?: string;
  kicker?: string;
};

export const USER_MENU: MenuItem[] = [
  { id: 'dashboard', label: '전체 현황', short: '현황', kicker: 'OVERVIEW', href: '/', icon: 'overview', kind: 'workflow', role: 'USER', step: 'dashboard' },
  { id: 'demand', label: '수요 확정', short: '수요', kicker: 'DEMAND', href: '/', icon: 'demand', kind: 'workflow', role: 'USER', step: 'demand' },
  { id: 'supply', label: '재고·공급', short: '재고', kicker: 'SUPPLY', href: '/', icon: 'supply', kind: 'workflow', role: 'USER', step: 'supply' },
  { id: 'master', label: '마스터 검증', short: '기준', kicker: 'MASTER DATA', href: '/', icon: 'master', kind: 'workflow', role: 'USER', step: 'master' },
  { id: 'calculation', label: '발주량 계산', short: '계산', kicker: 'CALCULATION', href: '/', icon: 'calculation', kind: 'workflow', role: 'USER', step: 'calculation' },
  { id: 'report', label: '보고자료', short: '보고', kicker: 'EXECUTIVE REPORT', href: '/', icon: 'report', kind: 'workflow', role: 'USER', step: 'report' },
  { id: 'leadtime', label: '리드타임 분석', href: '/analysis/leadtime', icon: 'leadtime', kind: 'analysis', role: 'USER' },
  { id: 'stockout', label: '재고 소진 위험', href: '/analysis/stockout', icon: 'stockout', kind: 'analysis', role: 'USER' },
];

export const ADMIN_MENU: MenuItem[] = [
  { id: 'admin-settings', label: '시스템 설정', href: '/admin/settings', icon: 'settings', kind: 'admin', role: 'ADMIN' },
  { id: 'admin-users', label: '사용자 관리', href: '/admin/users', icon: 'settings', kind: 'admin', role: 'ADMIN' },
];
