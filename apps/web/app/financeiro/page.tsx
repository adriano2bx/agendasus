'use client';

import { useEffect, useState } from 'react';
import { Navigation } from '../components/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
type Overview = { messages: number; billing: { eventCount: number; totalCost: string } };
export default function FinancialPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => { fetch(`${API}/dashboard/overview`, { headers: auth() }).then(async response => response.ok ? setData(await response.json()) : setMessage('Não foi possível carregar o financeiro.')).catch(() => setMessage('Não foi possível carregar o financeiro.')); }, []);
  return <main className="shell"><Navigation current="/financeiro" /><section className="container"><p className="eyebrow">Controle financeiro</p><h1>Custos de mensageria</h1><p className="muted">O custo é contabilizado por mensagem faturada, nunca por paciente.</p>{message ? <p className="error">{message}</p> : null}<div className="grid"><Card label="Custo total registrado" value={`R$ ${data?.billing.totalCost ?? '—'}`} /><Card label="Eventos de cobrança" value={data?.billing.eventCount ?? '—'} /><Card label="Mensagens processadas" value={data?.messages ?? '—'} /></div><section className="card" style={{ marginTop: 24 }}><h2>Exportação financeira</h2><p className="muted">Baixe o ledger com campanha, paciente, categoria, cobrança, custo e moeda.</p><button className="button" onClick={() => void download('financial.csv', 'financeiro.csv')}>Baixar CSV financeiro</button></section></section></main>;
}
function Card({ label, value }: { label: string; value: string | number }) { return <article className="card stat"><strong>{value}</strong><span className="muted">{label}</span></article>; }
function auth() { return { authorization: `Bearer ${sessionStorage.getItem('confirma_access_token') ?? ''}` }; }
async function download(path: string, name: string) { const response = await fetch(`${API}/reports/${path}`, { headers: auth() }); if (!response.ok) return; const url = URL.createObjectURL(await response.blob()); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url); }
