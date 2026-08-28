// 브라우저 클라이언트 컴포넌트에서 쿠키 세션을 사용하는 클라이언트입니다.

import { createBrowserClient } from '@supabase/ssr';
import { requireSupabaseEnv } from './env';

export function createSupabaseBrowserClient() {
  const { url, publishableKey } = requireSupabaseEnv();
  return createBrowserClient(url, publishableKey);
}
