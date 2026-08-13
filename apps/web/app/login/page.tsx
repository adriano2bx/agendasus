'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
      });
      if (!response.ok) throw new Error('E-mail ou senha inválidos');
      const result = (await response.json()) as { accessToken: string };
      sessionStorage.setItem('confirma_access_token', result.accessToken);
      router.push('/importacoes');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível entrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login card">
      <p className="eyebrow">Confirma SUS</p>
      <h2>Acessar o painel</h2>
      <p className="muted">Entre com as credenciais fornecidas pelo administrador.</p>
      <form onSubmit={submit}>
        <div className="field"><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" required /></div>
        <div className="field"><label htmlFor="password">Senha</label><input id="password" name="password" type="password" minLength={8} required /></div>
        {error ? <p className="error">{error}</p> : null}
        <button className="button" disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </main>
  );
}

