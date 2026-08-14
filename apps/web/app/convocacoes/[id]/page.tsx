'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '../../components/navigation';
import { Icon, StatusBadge } from '../../components/ui';
import { authFetch } from '../../lib/api';
import { formatDateTime } from '../../lib/date-time';
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<any>();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [manualStatus, setManualStatus] = useState<'CONFIRMED' | 'CANCELLED' | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const load = async () => {
    const response = await authFetch(`${API}/convocations/${id}`);
    if (!response.ok) throw new Error();
    setItem(await response.json());
  };
  useEffect(() => {
    load().catch(() => setError('Não foi possível carregar esta convocação.'));
  }, [id]);
  async function submitManualStatus() {
    if (!manualStatus || reason.trim().length < 3) return;
    setSaving(true);
    setError('');
    try {
      const response = await authFetch(`${API}/convocations/${id}/status`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: manualStatus, reason: reason.trim() }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? 'Não foi possível alterar o status.');
      }
      await load();
      setMessage(
        manualStatus === 'CONFIRMED'
          ? 'Convocação marcada como confirmada.'
          : 'Convocação marcada como cancelada.',
      );
      setManualStatus(null);
      setReason('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível alterar o status.');
    } finally {
      setSaving(false);
    }
  }
  if (!item)
    return (
      <AppShell title="Detalhe da convocação">
        {error ? <p className="error">{error}</p> : <p className="muted">Carregando…</p>}
      </AppShell>
    );
  const events = [
    ...item.messages.map((m: any) => ({
      id: m.id,
      title: `${stage(m.stage)} · ${messageStatus(m.status)}`,
      date: m.createdAt,
      type: 'message',
    })),
    ...item.responses.map((r: any) => ({
      id: r.id,
      title: `Resposta: ${r.action === 'CONFIRM' ? 'Confirmou' : 'Cancelou'}`,
      date: r.receivedAt,
      type: 'response',
    })),
  ].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return (
    <AppShell
      title={item.patient.displayName}
      eyebrow="Detalhe da convocação"
      actions={
        <>
          <Link className="button secondary" href="/convocacoes">
            Voltar
          </Link>
          <div className="action-menu-wrap">
            <button
              className="button secondary"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              Ações
            </button>
            {menuOpen ? (
              <div className="action-menu" role="menu">
                <button
                  role="menuitem"
                  disabled={isTerminal(item.status)}
                  onClick={() => {
                    setManualStatus('CONFIRMED');
                    setMenuOpen(false);
                  }}
                >
                  <span className="action-menu-icon success-icon">
                    <Icon name="check" />
                  </span>
                  <span>
                    <strong>Marcar como confirmado</strong>
                    <small>Finaliza o fluxo e bloqueia follow-ups</small>
                  </span>
                </button>
                <button
                  role="menuitem"
                  disabled={isTerminal(item.status)}
                  onClick={() => {
                    setManualStatus('CANCELLED');
                    setMenuOpen(false);
                  }}
                >
                  <span className="action-menu-icon danger-icon">
                    <Icon name="alert" />
                  </span>
                  <span>
                    <strong>Marcar como cancelado</strong>
                    <small>Cancela todos os próximos disparos</small>
                  </span>
                </button>
              </div>
            ) : null}
          </div>
        </>
      }
    >
      {message ? (
        <p className="success">
          <Icon name="check" />
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="error">
          <Icon name="alert" />
          {error}
        </p>
      ) : null}
      <div className="actions" style={{ marginBottom: 18 }}>
        <StatusBadge value={item.status} />
        <span className="badge">{stage(item.stage)}</span>
        <span className="muted">Campanha: {item.campaign.name}</span>
      </div>
      <section className="grid-main">
        <div style={{ display: 'grid', gap: 18 }}>
          <section className="grid two">
            <article className="panel">
              <header className="panel-header">
                <h2>Dados do paciente</h2>
              </header>
              <div className="panel-body">
                <Detail label="Nome completo" value={item.patient.displayName} />
                <Detail
                  label="Data de nascimento"
                  value={item.patient.birthDate ? dateOnly(item.patient.birthDate) : '—'}
                />
                <Detail label="CPF" value={formatCpf(item.patient.cpf)} />
                <Detail
                  label="Solicitações agrupadas"
                  value={`${item.records.length} ${item.records.length === 1 ? 'registro' : 'registros'}`}
                />
              </div>
            </article>
            <article className="panel">
              <header className="panel-header">
                <h2>Telefones</h2>
              </header>
              <div className="panel-body">
                {item.patient.phones.map((phone: any, index: number) => (
                  <Detail
                    key={phone.id ?? phone.normalizedValue}
                    label={
                      phone.selectedForWhatsApp
                        ? 'WhatsApp selecionado'
                        : `Alternativo ${index + 1}`
                    }
                    value={`${formatPhone(phone.normalizedValue)}${phone.valid ? '' : ' · inválido'}`}
                  />
                ))}
                {!item.patient.phones.length ? (
                  <p className="muted">Nenhum telefone cadastrado.</p>
                ) : null}
              </div>
            </article>
          </section>
          <article className="panel">
            <header className="panel-header">
              <div>
                <h2>Solicitações e procedimentos</h2>
                <span className="muted">Registros agrupados nesta convocação</span>
              </div>
              <span className="badge">{item.records.length} registros</span>
            </header>
            <div className="panel-body record-list">
              {item.records.map((relation: any) => {
                const record = relation.sourceRecord;
                return (
                  <section className="record-card" key={record.id}>
                    <div className="record-heading">
                      <div>
                        <small className="stat-label">Código da convocação</small>
                        <strong>{record.codigoConvocacaoOrigem}</strong>
                      </div>
                      <span className="badge">{date(record.scheduledAt)}</span>
                    </div>
                    <div className="procedure-list">
                      {record.procedures.map((procedure: any) => (
                        <div className="procedure-item" key={procedure.id}>
                          <span className="procedure-icon">
                            <Icon name="file" />
                          </span>
                          <div>
                            <small>Procedimento</small>
                            <strong>{procedure.name}</strong>
                          </div>
                        </div>
                      ))}
                      {!record.procedures.length ? (
                        <p className="muted">Nenhum procedimento associado a este registro.</p>
                      ) : null}
                    </div>
                  </section>
                );
              })}
              {!item.records.length ? (
                <p className="muted">Nenhum registro de origem associado.</p>
              ) : null}
            </div>
          </article>
          <article className="panel">
            <header className="panel-header">
              <h2>Mensagens e respostas</h2>
              <span className="badge">{item.messages.length} tentativas</span>
            </header>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Etapa</th>
                    <th>Template</th>
                    <th>Status</th>
                    <th>Submetida</th>
                    <th>Entregue</th>
                    <th>Lida</th>
                  </tr>
                </thead>
                <tbody>
                  {item.messages.map((m: any) => (
                    <tr key={m.id}>
                      <td>{stage(m.stage)}</td>
                      <td>{m.templateName}</td>
                      <td>
                        <StatusBadge value={m.status} />
                      </td>
                      <td>{date(m.submittedAt ?? m.createdAt)}</td>
                      <td>{date(m.deliveredAt)}</td>
                      <td>{date(m.readAt)}</td>
                    </tr>
                  ))}
                  {!item.messages.length ? (
                    <tr>
                      <td colSpan={6} className="muted">
                        Nenhuma mensagem enviada.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>
        </div>
        <aside style={{ display: 'grid', gap: 18 }}>
          <article className="panel">
            <header className="panel-header">
              <h2>Processo</h2>
            </header>
            <div className="panel-body">
              <Detail label="Campanha" value={item.campaign.name} />
              <Detail label="Etapa atual" value={stage(item.stage)} />
              <Detail
                label="Próxima ação"
                value={item.nextActionAt ? date(item.nextActionAt) : 'Nenhuma ação programada'}
              />
              {['CONFIRMED', 'CANCELLED', 'FINISHED_NO_RESPONSE'].includes(item.status) ? (
                <p className="success">
                  <Icon name="check" />
                  Fluxo finalizado
                </p>
              ) : null}
            </div>
          </article>
          <article className="panel">
            <header className="panel-header">
              <h2>Histórico</h2>
            </header>
            <div className="panel-body">
              <ol className="timeline">
                {events.map((event: any) => (
                  <li className="timeline-item" key={event.id}>
                    <span className="timeline-dot" />
                    <span className="timeline-copy">
                      <strong>{event.title}</strong>
                      <small>{date(event.date)}</small>
                    </span>
                  </li>
                ))}
                {!events.length ? <p className="muted">Nenhum evento registrado.</p> : null}
              </ol>
            </div>
          </article>
        </aside>
      </section>
      {manualStatus ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => !saving && setManualStatus(null)}
        >
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-status-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="modal-header">
              <div>
                <span className="page-eyebrow">Alteração manual</span>
                <h2 id="manual-status-title">
                  {manualStatus === 'CONFIRMED' ? 'Confirmar paciente' : 'Cancelar convocação'}
                </h2>
              </div>
            </header>
            <div className="modal-body">
              <p className="muted">
                Esta ação finaliza o fluxo e bloqueia automaticamente os próximos disparos.
              </p>
              <div className="field">
                <label htmlFor="manual-reason">Motivo da alteração</label>
                <textarea
                  id="manual-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Ex.: confirmação recebida por telefone"
                  maxLength={500}
                  autoFocus
                />
                <span className="field-hint">O motivo ficará registrado na auditoria.</span>
              </div>
            </div>
            <footer className="modal-actions">
              <button
                className="button secondary"
                disabled={saving}
                onClick={() => setManualStatus(null)}
              >
                Voltar
              </button>
              <button
                className={`button ${manualStatus === 'CANCELLED' ? 'danger' : ''}`}
                disabled={saving || reason.trim().length < 3}
                onClick={() => void submitManualStatus()}
              >
                {saving
                  ? 'Salvando…'
                  : manualStatus === 'CONFIRMED'
                    ? 'Confirmar paciente'
                    : 'Cancelar convocação'}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="row">
      <small className="stat-label">{label}</small>
      <strong>{value}</strong>
    </div>
  );
}
function date(value?: string | null) {
  return value ? formatDateTime(value) : '—';
}
function dateOnly(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value));
}
function formatCpf(value?: string | null) {
  if (!value) return '—';
  const digits = value.replace(/\D/g, '');
  return digits.length === 11
    ? digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    : value;
}
function formatPhone(value?: string | null) {
  if (!value) return '—';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 12 && digits.startsWith('55')) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  return `+${digits}`;
}
function isTerminal(value: string) {
  return ['CONFIRMED', 'CANCELLED', 'FINISHED_NO_RESPONSE'].includes(value);
}
function stage(value: string) {
  return (
    (
      {
        FIRST: '1ª convocação',
        SECOND: '2ª convocação',
        THIRD: '3ª convocação',
        FINISHED: 'Finalizada',
      } as Record<string, string>
    )[value] ?? value
  );
}
function messageStatus(value: string) {
  return (
    (
      {
        QUEUED: 'Na fila',
        PROCESSING: 'Processando',
        SUBMITTED: 'Submetida',
        SENT: 'Enviada',
        DELIVERED: 'Entregue',
        READ: 'Lida',
        FAILED: 'Falhou',
      } as Record<string, string>
    )[value] ?? value
  );
}
