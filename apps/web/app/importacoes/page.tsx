'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { AppShell } from '../components/navigation';
import { EmptyState, Icon, StatusBadge } from '../components/ui';
import { authFetch } from '../lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
type ImportItem = { id: string; status: string; recordsFound: number; createdAt: string; files: Array<{ originalName: string; sizeBytes?: number }> };

export default function ImportsPage() {
  const [message, setMessage] = useState(''); const [loading, setLoading] = useState(false); const [fileName, setFileName] = useState(''); const [imports, setImports] = useState<ImportItem[]>([]); const input = useRef<HTMLInputElement>(null);
  async function loadImports() { const response = await authFetch(`${API_URL}/imports`); if (response.ok) setImports(await response.json()); }
  useEffect(() => { void loadImports(); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage(''); const form = event.currentTarget; const body = new FormData(form);
    try { const response = await authFetch(`${API_URL}/imports`, { method: 'POST', body }); if (!response.ok) throw new Error('Não foi possível enviar o PDF'); const result = await response.json() as { id: string }; setMessage('Arquivo recebido. A extração foi iniciada.'); form.reset(); setFileName(''); await loadImports(); window.setTimeout(() => location.assign(`/importacoes/${result.id}`), 500); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Falha no upload'); } finally { setLoading(false); }
  }
  return <AppShell title="Importações" eyebrow="Entrada de dados">
    <p className="content-lead">Envie um relatório SISREG, confira os dados extraídos e programe a campanha em um fluxo guiado.</p>
    <section className="steps panel"><Step n="1" label="Arquivo" active/><Step n="2" label="Conferência"/><Step n="3" label="Pacientes"/><Step n="4" label="Programação"/><Step n="5" label="Revisão e início"/></section>
    <form className="grid-main" onSubmit={submit}>
      <article className="panel"><header className="panel-header"><h2>Selecione o relatório</h2><span className="badge">PDF · até 20 MB</span></header><div className="panel-body">
        <label className="upload-zone" htmlFor="file"><input ref={input} id="file" name="file" type="file" accept="application/pdf,.pdf" required onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}/><span className="upload-icon"><Icon name={fileName ? 'check' : 'upload'} /></span><strong>{fileName || 'Arraste ou selecione o arquivo PDF'}</strong><p>{fileName ? 'Arquivo pronto para processamento' : 'O arquivo será excluído depois da extração segura'}</p></label>
        {message ? <p className={message.startsWith('Arquivo') ? 'success' : 'error'}><Icon name={message.startsWith('Arquivo') ? 'check' : 'alert'} />{message}</p> : null}
        <div className="actions" style={{ marginTop: 16 }}><button className="button" disabled={loading || !fileName}>{loading ? 'Processando…' : 'Enviar e continuar'}<Icon name="chevron" /></button></div>
      </div></article>
      <aside className="panel"><header className="panel-header"><h2>Como funciona</h2></header><div className="panel-body"><ol className="timeline"><Timeline title="Extração automática" text="Identificamos os campos do relatório SISREG."/><Timeline title="Conferência antes do envio" text="Nada é programado sem sua aprovação."/><Timeline title="Agrupamento por paciente" text="Solicitações da mesma pessoa ficam juntas."/></ol></div></aside>
    </form>
    <section className="panel section-gap"><header className="panel-header"><h2>Importações recentes</h2><span className="muted">{imports.length} arquivos</span></header>
      {imports.length ? <div className="table-wrap"><table><thead><tr><th>Arquivo</th><th>Data</th><th>Registros</th><th>Situação</th><th></th></tr></thead><tbody>{imports.map(item => <tr key={item.id}><td><Link className="table-link" href={`/importacoes/${item.id}`}>{item.files[0]?.originalName ?? 'Relatório SISREG'}</Link></td><td>{new Date(item.createdAt).toLocaleString('pt-BR')}</td><td>{item.recordsFound}</td><td><StatusBadge value={item.status === 'READY_FOR_REVIEW' ? 'SCHEDULED' : item.status}/></td><td><Link className="icon-button" aria-label="Abrir importação" href={`/importacoes/${item.id}`}><Icon name="chevron" /></Link></td></tr>)}</tbody></table></div> : <EmptyState title="Nenhuma importação" description="O primeiro arquivo processado aparecerá aqui."/>}
    </section>
  </AppShell>;
}
function Step({ n, label, active }: { n: string; label: string; active?: boolean }) { return <div className={`step${active ? ' active' : ''}`}><span className="step-number">{n}</span><span>{label}</span></div>; }
function Timeline({ title, text }: { title: string; text: string }) { return <li className="timeline-item"><span className="timeline-dot"/><span className="timeline-copy"><strong>{title}</strong><small>{text}</small></span></li>; }
