'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { importBatch, rollbackBatch, stageImport } from '@/lib/import/repository';
import type { ImportMode, ImportType } from '@/lib/import/types';

function fail(message: string): never { redirect(`/admin/data-management?error=${encodeURIComponent(message)}`); }

export async function stageImportAction(formData: FormData) {
  await requireAdmin();
  const file = formData.get('file');
  const type = String(formData.get('importType') ?? '') as ImportType;
  const mode = String(formData.get('importMode') ?? 'append') as ImportMode;
  if (!(file instanceof File) || file.size === 0) fail('파일을 선택해 주세요.');
  try { const result = await stageImport(file, type, mode); redirect(`/admin/data-management?batch=${result.batchId}`); } catch (error) { if (error instanceof Error && error.message.startsWith('NEXT_REDIRECT')) throw error; fail(error instanceof Error ? error.message : '파일 검증에 실패했습니다.'); }
}

export async function importBatchAction(formData: FormData) {
  await requireAdmin();
  const batchId = String(formData.get('batchId') ?? '');
  try { await importBatch(batchId); revalidatePath('/admin/data-management'); redirect('/admin/data-management?imported=1'); } catch (error) { fail(error instanceof Error ? error.message : 'import에 실패했습니다.'); }
}

export async function rollbackBatchAction(formData: FormData) {
  await requireAdmin();
  const batchId = String(formData.get('batchId') ?? '');
  try { await rollbackBatch(batchId); revalidatePath('/admin/data-management'); redirect('/admin/data-management?rolledBack=1'); } catch (error) { fail(error instanceof Error ? error.message : 'rollback에 실패했습니다.'); }
}
