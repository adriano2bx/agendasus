'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
type Item = { id: string; stage: string; status: string; nextActionAt: string | null; patient: { displayName: string; phones: Array<{ normalizedValue: string }> }; campaign: { name: string }; records: Array<{ sourceRecord: { procedures: Array<{ name: string }> } }>; messages: Array<{ status: string; createdAt: string }> };
export default function ConvocationsPage() {
  const [items, setItems] = useState<Item[]>([]); const [error, setError] = useState('');
  useEffect(() => { const token = sessionStorage.getItem('confirma_access_token'); fetch(`${API}/convocations`, { headers: { authorization: `Bearer ${token}` } }).then(async r => r.ok ? setItems((await r.json()).items) : setError('Não foi possível carregar as convocações.')).catch(() => setError('Não foi possível carregar as convocações.')); }, []);
  return <main className="shell"><header className="topbar"><Link href="/painel" className="brand">Confirma SUS</Link><Link href="/importacoes">Importações</Link></header><section className="container"><p className="eyebrow">Pacientes</p><h1>Convocações</h1>{error ? <p className="error">{error}</p> : null}<section className="card">{items.map(item => <Link key={item.id} href={`/convocacoes/${item.id}`} style={{ display: 'block', padding: '14px 0', borderBottom: '1px solid var(--line)', textDecoration: 'none' }}><strong>{item.patient.displayName}</strong><p className="muted">{item.campaign.name} · {item.stage} · {item.status} · {item.patient.phones[0]?.normalizedValue ?? 'sem telefone'}</p></Link>)}{items.length === 0 ? <p className="muted">Nenhuma convocação encontrada.</p> : null}</section></section></main>;
}

