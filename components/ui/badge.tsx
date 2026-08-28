export type Status = 'SAFE' | 'WARNING' | 'CRITICAL' | 'CALCULATION_UNAVAILABLE';

const labels: Record<Status, string> = {
  SAFE: '안전',
  WARNING: '주의',
  CRITICAL: '위험',
  CALCULATION_UNAVAILABLE: '계산 불가',
};

export default function Badge({ status, children }: { status: Status; children?: string }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}>{children ?? labels[status]}</span>;
}
