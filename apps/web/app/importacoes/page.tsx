'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { Navigation } from '../components/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export default function ImportsPage() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [imports, setImports] = useState<Array<{ id: string; status: string; recordsFound: number; createdAt: string; files: Array<{ originalName: string }> }>>([]);

  async function loadImports() {
    const token = sessionStorage.getItem('confirma_access_token');
    if (!token) return;
    const response = await fetch(`${API_URL}/imports`, { headers: { authorization: `Bearer ${token}` } });
    if (response.ok) setImports(await response.json());
  }

  useEffect(() => { void loadImports(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const form = event.currentTarget;
    const body = new FormData(form);
    const token = sessionStorage.getItem('confirma_access_token');
    try {
      const response = await fetch(`${API_URL}/imports`, {
        method: 'POST',
        headers: token ? { authorization: `Bearer ${token}` } : {},
        body,
      });
      if (!response.ok) throw new Error('Não foi possível enviar o PDF');
      const result = (await response.json()) as { id: string };
      setMessage(`Importação ${result.id} recebida e encaminhada para processamento.`);
      form.reset();
      void loadImports();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Falha no upload');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <Navigation current="/importacoes" />
      <section className="container">
        <p className="eyebrow">Nova importação</p>
        <h1>Importe o relatório SISREG</h1>
        <p className="muted">O upload apenas extrai os dados. Nenhuma campanha será criada ou iniciada automaticamente.</p>
        <form className="card" onSubmit={submit} style={{ marginTop: 28 }}>
          <div className="field"><label htmlFor="file">Arquivo PDF</label><input id="file" name="file" type="file" accept="application/pdf,.pdf" required /></div>
          {message ? <p className={message.startsWith('Importação') ? 'success' : 'error'}>{message}</p> : null}
          <button className="button" disabled={loading}>{loading ? 'Enviando…' : 'Enviar e processar'}</button>
        </form>
        <section style={{ marginTop: 32 }}>
          <h2>Importações recentes</h2>
          <div className="grid">
            {imports.map((item) => (
              <Link className="card" key={item.id} href={`/importacoes/${item.id}`}>
                <strong>{item.files[0]?.originalName ?? 'Relatório SISREG'}</strong>
                <p className="muted">{item.recordsFound} registros · {item.status}</p>
              </Link>
            ))}
            {imports.length === 0 ? <p className="muted">Nenhuma importação disponível.</p> : null}
          </div>
        </section>
      </section>
    </main>
  );
}
