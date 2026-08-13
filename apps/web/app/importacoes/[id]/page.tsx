'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
type Review = {
  id: string;
  status: string;
  layout: string | null;
  warnings: string[] | null;
  counts: { totalRows: number; validRows: number; warningRows: number; invalidRows: number; identifiedPatients: number };
  canApprove: boolean;
  sourceRecordCount: number;
  rows: Array<{ id: string; rowNumber: number; validationStatus: string; validationIssues: string[] | null; data: Record<string, unknown> | null }>;
};

export default function ImportReviewPage() {
  const params = useParams<{ id: string }>();
  const [review, setReview] = useState<Review | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);

  async function request(path: string, init?: RequestInit) {
    const token = sessionStorage.getItem('confirma_access_token');
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
    });
    if (!response.ok) throw new Error((await response.json().catch(() => null))?.message ?? 'Não foi possível concluir a operação');
    return response.json();
  }

  async function load() {
    try { setReview(await request(`/imports/${params.id}/review`)); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Falha ao carregar revisão'); }
  }

  useEffect(() => { void load(); }, [params.id]);

  async function approve() {
    setLoading(true); setMessage('');
    try { await request(`/imports/${params.id}/approve`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); await load(); setMessage('Importação aprovada. Configure a campanha abaixo.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível aprovar'); }
    finally { setLoading(false); }
  }

  async function createCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage('');
    const data = new FormData(event.currentTarget);
    try {
      const campaign = await request(`/campaigns/from-import/${params.id}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'), firstActionAt: data.get('firstActionAt'),
          secondIntervalDays: Number(data.get('secondIntervalDays')), secondStartTime: data.get('secondStartTime'),
          thirdIntervalDays: Number(data.get('thirdIntervalDays')), thirdStartTime: data.get('thirdStartTime'),
        }),
      });
      setMessage(`Campanha criada em rascunho com ${campaign.patientCount} pacientes.`);
      setCampaignId(campaign.id);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível criar campanha'); }
    finally { setLoading(false); }
  }

  async function scheduleCampaign() {
    if (!campaignId) return;
    setLoading(true); setMessage('');
    try {
      await request(`/campaigns/${campaignId}/schedule`, { method: 'POST' });
      setMessage('Campanha programada. O worker processará as convocações no horário definido em modo seguro.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível programar'); }
    finally { setLoading(false); }
  }

  if (!review) return <main className="container"><p className="muted">Carregando revisão…</p>{message ? <p className="error">{message}</p> : null}</main>;
  const approved = review.status === 'APPROVED';
  return (
    <main className="shell">
      <header className="topbar"><Link className="brand" href="/importacoes">Confirma SUS</Link><span>Revisão de importação</span></header>
      <section className="container">
        <p className="eyebrow">{review.layout ?? 'Layout pendente'}</p>
        <h1>Conferir registros extraídos</h1>
        <div className="grid">
          <article className="card stat"><strong>{review.counts.totalRows}</strong><span className="muted">registros encontrados</span></article>
          <article className="card stat"><strong>{review.counts.identifiedPatients}</strong><span className="muted">pacientes identificados</span></article>
          <article className="card stat"><strong>{review.counts.invalidRows}</strong><span className="muted">registros inválidos</span></article>
        </div>
        {review.warnings?.map((warning) => <p className="error" key={warning}>{warning}</p>)}
        {message ? <p className={message.startsWith('Importação aprovada') || message.startsWith('Campanha') ? 'success' : 'error'}>{message}</p> : null}
        {review.canApprove ? <button className="button" disabled={loading} onClick={() => void approve()}>Aprovar importação</button> : null}
        <section className="card" style={{ marginTop: 28 }}>
          <h2>Registros</h2>
          {review.rows.map((row) => <article key={row.id} style={{ borderTop: '1px solid var(--line)', padding: '14px 0' }}><strong>#{row.rowNumber} · {row.validationStatus}</strong><p className="muted">{String(row.data?.nome ?? 'Nome não identificado')} · {String(row.data?.dataNascimento ?? '—')} · {String(row.data?.codigoConvocacaoOrigem ?? '—')}</p>{row.validationIssues?.map((issue) => <small className="error" key={issue}>{issue}</small>)}</article>)}
        </section>
        {approved ? <form className="card" style={{ marginTop: 28 }} onSubmit={createCampaign}>
          <h2>Criar campanha em rascunho</h2>
          <div className="field"><label htmlFor="name">Nome</label><input id="name" name="name" defaultValue={`SISREG ${new Date().toLocaleDateString('pt-BR')}`} required /></div>
          <div className="field"><label htmlFor="firstActionAt">1ª convocação — data e horário de início</label><input id="firstActionAt" name="firstActionAt" type="datetime-local" required /></div>
          <div className="grid"><div className="field"><label htmlFor="secondIntervalDays">2ª convocação — dias após a 1ª</label><input id="secondIntervalDays" name="secondIntervalDays" type="number" min="1" max="30" defaultValue="2" required /></div><div className="field"><label htmlFor="secondStartTime">2ª convocação — horário</label><input id="secondStartTime" name="secondStartTime" type="time" defaultValue="09:00" required /></div><div className="field"><label htmlFor="thirdIntervalDays">3ª convocação — dias após a 2ª</label><input id="thirdIntervalDays" name="thirdIntervalDays" type="number" min="1" max="30" defaultValue="3" required /></div><div className="field"><label htmlFor="thirdStartTime">3ª convocação — horário</label><input id="thirdStartTime" name="thirdStartTime" type="time" defaultValue="09:00" required /></div></div>
          <button className="button" disabled={loading}>{loading ? 'Criando…' : 'Criar campanha'}</button>
        </form> : null}
        {campaignId ? <section className="card" style={{ marginTop: 18 }}><h2>Programar campanha</h2><p className="muted">No ambiente atual, cada tentativa será registrada em modo DRY_RUN: nenhuma mensagem real será enviada.</p><button className="button" disabled={loading} onClick={() => void scheduleCampaign()}>Programar campanha</button></section> : null}
      </section>
    </main>
  );
}
