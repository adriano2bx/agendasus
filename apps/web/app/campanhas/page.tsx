'use client';

import { useEffect, useState } from 'react';
import { Navigation } from '../components/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
type Campaign = { id: string; name: string; status: string; firstActionAt: string | null; secondIntervalDays: number | null; secondStartTime: string | null; thirdIntervalDays: number | null; thirdStartTime: string | null; _count: { convocations: number } };

export default function CampaignsPage() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [message, setMessage] = useState('');
  const load = async () => {
    const response = await fetch(`${API}/campaigns`, { headers: auth() });
    if (response.ok) setItems(await response.json()); else setMessage('Não foi possível carregar as campanhas.');
  };
  useEffect(() => { void load(); }, []);
  async function action(campaign: Campaign, operation: 'schedule' | 'pause' | 'resume' | 'cancel') {
    if (operation === 'cancel' && !window.confirm(`Cancelar a campanha “${campaign.name}”? Os disparos futuros serão bloqueados.`)) return;
    setMessage('');
    const response = await fetch(`${API}/campaigns/${campaign.id}/${operation}`, { method: 'POST', headers: auth() });
    setMessage(response.ok ? 'Campanha atualizada.' : await errorOf(response));
    if (response.ok) await load();
  }
  return <main className="shell"><Navigation current="/campanhas" /><section className="container"><p className="eyebrow">Operação</p><h1>Campanhas</h1><p className="muted">Programe, pause, retome ou cancele campanhas sem perder o histórico.</p>{message ? <p className={message === 'Campanha atualizada.' ? 'success' : 'error'}>{message}</p> : null}<section className="card table-wrap"><table><thead><tr><th>Campanha</th><th>Pacientes</th><th>Programação</th><th>Status</th><th>Ações</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item._count.convocations}</td><td><strong>1ª:</strong> {item.firstActionAt ? new Date(item.firstActionAt).toLocaleString('pt-BR') : '—'}<br /><span className="muted"><strong>2ª:</strong> {item.secondIntervalDays ?? '—'} dias após a 1ª às {item.secondStartTime ?? '—'} · <strong>3ª:</strong> {item.thirdIntervalDays ?? '—'} dias após a 2ª às {item.thirdStartTime ?? '—'}</span></td><td><span className="badge">{item.status}</span></td><td className="actions">{item.status === 'DRAFT' ? <button className="button small" onClick={() => void action(item, 'schedule')}>Programar</button> : null}{['SCHEDULED', 'RUNNING'].includes(item.status) ? <button className="button secondary small" onClick={() => void action(item, 'pause')}>Pausar</button> : null}{item.status === 'PAUSED' ? <button className="button small" onClick={() => void action(item, 'resume')}>Retomar</button> : null}{!['CANCELLED', 'COMPLETED'].includes(item.status) ? <button className="button danger small" onClick={() => void action(item, 'cancel')}>Cancelar</button> : null}</td></tr>)}{items.length === 0 ? <tr><td colSpan={5} className="muted">Nenhuma campanha criada. Aprove uma importação para criar a primeira.</td></tr> : null}</tbody></table></section></section></main>;
}
function auth() { const token = typeof window === 'undefined' ? '' : sessionStorage.getItem('confirma_access_token') ?? ''; return { authorization: `Bearer ${token}` }; }
async function errorOf(response: Response) { const data = await response.json().catch(() => null) as { message?: string | string[] } | null; return Array.isArray(data?.message) ? data!.message.join(', ') : data?.message ?? 'Não foi possível atualizar a campanha.'; }
