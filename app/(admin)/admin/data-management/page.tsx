import { requireAdmin } from '@/lib/auth';
import { getImportBatch, getImportHistory } from '@/lib/import/history';
import { listImportDefinitions } from '@/lib/import/schema';
import PageHeader from '@/components/shell/page-header';
import Panel from '@/components/ui/panel';
import DataTable from '@/components/ui/data-table';
import EmptyValue from '@/components/ui/empty-value';
import { importBatchAction, rollbackBatchAction, stageImportAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function DataManagementPage({ searchParams }: { searchParams: Promise<{ batch?: string; error?: string; imported?: string; rolledBack?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const history = await getImportHistory();
  const selected = params.batch ? await getImportBatch(params.batch) : { batch: null, staging: [], errors: [], error: null };
  return <main className="analysis-page">
    <PageHeader eyebrow="ADMIN / DATA" title="Data Management" description="파일을 검증한 뒤 승인된 데이터만 RAW에 적재합니다." />
    {params.error && <p className="error-message">{params.error}</p>}
    {params.imported && <p className="success-message">적재가 완료되었습니다.</p>}
    {params.rolledBack && <p className="success-message">batch rollback이 완료되었습니다.</p>}
    <Panel title="File Upload" description="CSV 또는 XLSX 파일을 선택하세요.">
      <form action={stageImportAction} encType="multipart/form-data" className="account-form">
        <label>파일<input name="file" type="file" accept=".csv,.xlsx" required /></label>
        <label>데이터 종류<select name="importType" defaultValue="usage_history">{listImportDefinitions().map((definition) => <option key={definition.type} value={definition.type}>{definition.type}</option>)}</select></label>
        <label>Import mode<select name="importMode" defaultValue="append"><option value="append">append</option><option value="upsert">upsert</option><option value="replace">replace</option></select></label>
        <button className="button primary" type="submit">Parse 및 Validation</button>
      </form>
    </Panel>
    {selected.batch && <><Panel title="Preview / Column Mapping" description="상위 100행을 확인하고 서버에서 추정한 매핑을 검토합니다."><DataTable columns={[{ key: 'row_number', label: '행' }, { key: 'original_row', label: '원본 행', render: (row) => JSON.stringify(row.original_row) }, { key: 'mapped_row', label: '표준 매핑 행', render: (row) => JSON.stringify(row.mapped_row) }, { key: 'validation_status', label: '검증 상태' }]} rows={selected.staging} rowKey={(row) => String(row.row_number)} empty="staging 데이터가 없습니다." /></Panel><Panel title="Validation Result" description="오류가 있는 batch는 적재할 수 없습니다."><p>파일: {selected.batch.file_name}</p><p>총 행: {selected.batch.total_rows} / 성공: {selected.batch.success_rows} / 경고: {selected.batch.warning_rows} / 오류: {selected.batch.error_rows}</p>{selected.errors.length > 0 && <><a className="button" href={`/admin/data-management/errors?batch=${selected.batch.batch_id}`}>ERROR/WARNING CSV 다운로드</a><DataTable columns={[{ key: 'row_number', label: '행' }, { key: 'field_name', label: '필드' }, { key: 'error_code', label: '코드' }, { key: 'error_message', label: '메시지' }, { key: 'severity', label: '등급' }]} rows={selected.errors} rowKey={(row) => String(row.error_id)} /></>}<div className="button-row"><form action={importBatchAction}><input type="hidden" name="batchId" value={selected.batch.batch_id} /><button className="button primary" type="submit" disabled={selected.batch.error_rows > 0}>사용자 승인 후 Import</button></form><form action={rollbackBatchAction}><input type="hidden" name="batchId" value={selected.batch.batch_id} /><button className="button" type="submit" disabled={selected.batch.status !== 'IMPORTED'}>Rollback</button></form></div></Panel></>}
    <Panel title="Import History"><DataTable columns={[
      { key: 'file_name', label: '파일명' }, { key: 'import_type', label: '타입' }, { key: 'import_mode', label: '모드' }, { key: 'total_rows', label: '총 행' }, { key: 'success_rows', label: '성공' }, { key: 'warning_rows', label: '경고' }, { key: 'error_rows', label: '오류' }, { key: 'status', label: '상태' }, { key: 'uploaded_at', label: '업로드 시간', render: (row) => <EmptyValue value={String(row.uploaded_at ?? '')} reasonCode="NO_TIME" /> },
    ]} rows={history.rows} rowKey={(row) => String(row.batch_id)} empty="업로드 이력이 없습니다." /></Panel>
  </main>;
}
