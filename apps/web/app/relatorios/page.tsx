'use client';

import { useState } from 'react';
import { Navigation } from '../components/navigation';
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export default function ReportsPage() {
  const [message, setMessage] = useState('');
  async function download(path: string, name: string) {
    setMessage('Gerando arquivo…');
    const response = await fetch(`${API}/reports/${path}`, { headers: { authorization: `Bearer ${sessionStorage.getItem('confirma_access_token') ?? ''}` } });
    if (!response.ok) { setMessage('Não foi possível gerar o relatório.'); return; }
    const url = URL.createObjectURL(await response.blob()); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url); setMessage('Download iniciado.');
  }
  return <main className="shell"><Navigation current="/relatorios" /><section className="container"><p className="eyebrow">Relatórios operacionais</p><h1>Exportações</h1><p className="muted">Exporte os dados consolidados para conferência e operação.</p>{message ? <p className={message === 'Download iniciado.' ? 'success' : 'muted'}>{message}</p> : null}<div className="grid"><article className="card"><h2>Relatório de disparos</h2><p className="muted">Pacientes, telefone, campanha, etapa, status, mensagens e resposta.</p><button className="button" onClick={() => void download('dispatches.csv', 'disparos.csv')}>Baixar CSV</button></article><article className="card"><h2>Relatório financeiro</h2><p className="muted">Eventos de cobrança, categoria, custo, moeda e campanha.</p><button className="button" onClick={() => void download('financial.csv', 'financeiro.csv')}>Baixar CSV</button></article><article className="card"><h2>Próximas versões</h2><p className="muted">PDF e Excel serão disponibilizados sobre os mesmos dados, sem alterar o histórico.</p></article></div></section></main>;
}
