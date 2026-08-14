'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Brand, Icon } from '../components/ui';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError('');
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: data.get('email'), password: data.get('password') }) });
      if (!response.ok) throw new Error('E-mail ou senha inválidos');
      const result = (await response.json()) as { accessToken: string };
      sessionStorage.setItem('confirma_access_token', result.accessToken);
      router.push('/painel');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível entrar'); }
    finally { setLoading(false); }
  }

  return <main className="login-layout">
    <section className="login-panel"><div className="login-form">
      <Brand />
      <h1>Bem-vindo</h1>
      <p className="content-lead">Acesse sua área de trabalho para acompanhar as convocações.</p>
      <form onSubmit={submit}>
        <div className="field"><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" autoComplete="username" placeholder="seu@email.com" required /></div>
        <div className="field"><label htmlFor="password">Senha</label><input id="password" name="password" type="password" autoComplete="current-password" minLength={8} placeholder="Digite sua senha" required /></div>
        {error ? <p className="error"><Icon name="alert" />{error}</p> : null}
        <button className="button" style={{ width: '100%' }} disabled={loading}>{loading ? 'Entrando…' : 'Entrar no painel'}<Icon name="chevron" /></button>
      </form>
    </div></section>
    <aside className="login-visual"><div className="login-message"><h2>Convocações claras.<br/>Operação sob controle.</h2><p>Do relatório SISREG à resposta do paciente, acompanhe cada etapa em um fluxo seguro e auditável.</p></div></aside>
  </main>;
}
