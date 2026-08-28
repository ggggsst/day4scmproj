import { requireUser } from '@/lib/auth';
import { getModelComparison } from '@/lib/scm';

export async function GET(request: Request) {
  await requireUser();
  const runId = new URL(request.url).searchParams.get('runId') ?? undefined;
  const { performance, error } = await getModelComparison(runId);
  if (error) return new Response(error, { status: 500 });
  const header = 'run_id,model_id,model_version,item_id,n_periods,wape,mape,bias,rmse,mae,rank,calculation_status,reason_code';
  const lines = performance.map((row) => [row.runId, row.modelId, row.modelVersion, row.itemId, row.nPeriods, row.wape, row.mape, row.bias, row.rmse, row.mae, row.rank, row.calculationStatus, row.reasonCode].map((value) => `"${String(value ?? '')}"`).join(','));
  return new Response([header, ...lines].join('\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="model-performance.csv"' } });
}
