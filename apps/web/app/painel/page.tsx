'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
type Overview = { activeCampaigns: number; convocations: number; messages: number; convocationByStatus: Record<string, number>; messageByStatus: Record<string, number>; billing: { eventCount: number; totalCost: string } };

export default function DashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const token = sessionStorage.getItem('confirma_access_token');
    fetch(`${API}/dashboard/overview`, { headers: { authorization: `Bearer ${token}` } })
      .then(async (response) => response.ok ? setData(await response.json()) : setError('Não foi possível carregar o painel.'))
      .catch(() => setError('Não foi possível carregar o painel.'));
  }, []);
  return <main className="shell"><header className="topbar"><Link href="/painel" className="brand">Confirma SUS</Link><nav><Link href="/importacoes">Importações</Link>{' · '}<Link href="/convocacoes">Convocações</Link></nav></header><section className="container"><p className="eyebrow">Visão operacional</p><h1>Painel de convocações</h1>{error ? <p className="error">{error}</p> : null}{!data ? <p className="muted">Carregando indicadores…</p> : <><div className="grid"><Card label="Campanhas ativas" value={data.activeCampaigns} /><Card label="Pacientes em processo" value={data.convocations} /><Card label="Mensagens" value={data.messages} /><Card label="Custo registrado" value={`R$ ${data.billing.totalCost}`} /></div><section className="grid" style={{ marginTop: 24 }}><article className="card"><h2>Convocações</h2>{Object.entries(data.convocationByStatus).map(([key, value]) => <p className="muted" key={key}>{key}: <strong>{value}</strong></p>)}</article><article className="card"><h2>Mensagens</h2>{Object.entries(data.messageByStatus).map(([key, value]) => <p className="muted" key={key}>{key}: <strong>{value}</strong></p>)}</article></section></>}</section></main>;
}
function Card({ label, value }: { label: string; value: string | number }) { return <article className="card stat"><strong>{value}</strong><span className="muted">{label}</span></article>; }

