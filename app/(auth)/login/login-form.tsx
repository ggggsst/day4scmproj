'use client';

import { useActionState } from 'react';
import { loginAction, type LoginState } from '../actions';

const initialState: LoginState = { error: null };

export default function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <main className="auth-page">
      <section className="auth-card card">
        <div className="brand-mark">OP</div>
        <p className="eyebrow">MONTHLY PROCUREMENT CONTROL</p>
        <h1>월간 발주계획 로그인</h1>
        <p className="muted">등록된 계정으로 시스템에 접속하세요.</p>
        <form action={action} className="auth-form">
          <input type="hidden" name="next" value={nextPath} />
          <label>이메일<input name="email" type="email" autoComplete="email" required /></label>
          <label>비밀번호<input name="password" type="password" autoComplete="current-password" required /></label>
          {state.error && <p className="form-error" role="alert">{state.error}</p>}
          <button className="button primary" type="submit" disabled={pending}>{pending ? '로그인 중…' : '로그인'}</button>
        </form>
      </section>
    </main>
  );
}
