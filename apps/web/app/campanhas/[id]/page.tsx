'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../components/navigation';
import { Feedback, Icon, LoadingState, StatusBadge } from '../../components/ui';
import { authFetch } from '../../lib/api';
import { dateTimeLocalToIso, formatDateTime, toDateTimeLocalValue } from '../../lib/date-time';
import { statusLabel } from '../../lib/labels';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
type Campaign = {
  id: string;
  name: string;
  status: string;
  firstActionAt: string | null;
  secondIntervalDays: number | null;
  secondStartTime: string | null;
  thirdIntervalDays: number | null;
  thirdStartTime: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  import: { files: Array<{ originalName: string }> };
  _count: { convocations: number };
  convocationByStatus: Record<string, number>;
  convocationByStage: Record<string, number>;
  messageByStatus: Record<string, number>;
  recentAudit: Array<{
    id: string;
    eventType: string;
    createdAt: string;
    user: { name: string } | null;
  }>;
};

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Campaign | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmSchedule, setConfirmSchedule] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(
    null,
  );
  const load = useCallback(async () => {
    try {
      const response = await authFetch(`${API}/campaigns/${id}`);
      if (!response.ok) throw new Error('Não foi possível carregar a campanha.');
      setItem(await response.json());
    } catch (cause) {
      setFeedback({
        tone: 'error',
        text: cause instanceof Error ? cause.message : 'Não foi possível carregar a campanha.',
      });
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!item) return;
    setSaving(true);
    setFeedback(null);
    const data = new FormData(event.currentTarget);
    try {
      const response = await authFetch(`${API}/campaigns/${item.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          firstActionAt: dateTimeLocalToIso(String(data.get('firstActionAt'))),
          secondIntervalDays: Number(data.get('secondIntervalDays')),
          secondStartTime: data.get('secondStartTime'),
          thirdIntervalDays: Number(data.get('thirdIntervalDays')),
          thirdStartTime: data.get('thirdStartTime'),
        }),
      });
      if (!response.ok) throw new Error(await errorOf(response));
      await load();
      setEditing(false);
      setFeedback({ tone: 'success', text: 'Configurações do rascunho atualizadas.' });
    } catch (cause) {
      setFeedback({
        tone: 'error',
        text: cause instanceof Error ? cause.message : 'Não foi possível salvar.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function scheduleCampaign() {
    if (!item) return;
    setSaving(true);
    setFeedback(null);
    try {
      const response = await authFetch(`${API}/campaigns/${item.id}/schedule`, { method: 'POST' });
      if (!response.ok) throw new Error(await errorOf(response));
      setConfirmSchedule(false);
      await load();
      setFeedback({
        tone: 'success',
        text: 'Campanha programada. O processamento será iniciado automaticamente no horário definido.',
      });
    } catch (cause) {
      setFeedback({
        tone: 'error',
        text: cause instanceof Error ? cause.message : 'Não foi possível programar.',
      });
    } finally {
      setSaving(false);
    }
  }

  if (!item)
    return (
      <AppShell title="Detalhe da campanha">
        <section className="panel">
          {feedback ? (
            <Feedback tone="error">{feedback.text}</Feedback>
          ) : (
            <LoadingState label="Carregando campanha…" />
          )}
        </section>
      </AppShell>
    );
  const finalized =
    (item.convocationByStatus.CONFIRMED ?? 0) +
    (item.convocationByStatus.CANCELLED ?? 0) +
    (item.convocationByStatus.FINISHED_NO_RESPONSE ?? 0);
  const progress = item._count.convocations
    ? Math.round((finalized / item._count.convocations) * 100)
    : 0;
  const schedule = schedulePreview(item);

  return (
    <AppShell
      title={item.name}
      eyebrow="Detalhe da campanha"
      actions={
        <>
          <Link className="button secondary" href="/campanhas">
            Voltar
          </Link>
          <Link className="button" href={`/convocacoes?campaignId=${item.id}`}>
            Ver pacientes
          </Link>
        </>
      }
    >
      {feedback ? <Feedback tone={feedback.tone}>{feedback.text}</Feedback> : null}
      <section className="campaign-hero panel">
        <div>
          <StatusBadge value={item.status} />
          <p>
            Importação: <strong>{item.import.files[0]?.originalName ?? 'Relatório SISREG'}</strong>
          </p>
          <small>Criada em {formatDateTime(item.createdAt)}</small>
        </div>
        <div className="campaign-progress">
          <span>
            <strong>{progress}%</strong>
            <small>do fluxo finalizado</small>
          </span>
          <span className="progress">
            <i style={{ width: `${progress}%` }} />
          </span>
        </div>
        {item.status === 'DRAFT' ? (
          <button className="button" onClick={() => setConfirmSchedule(true)}>
            <Icon name="send" />
            Programar campanha
          </button>
        ) : null}
      </section>
      <section className="grid campaign-metrics section-gap">
        <Metric label="Pacientes" value={item._count.convocations} />
        <Metric
          label="Confirmados"
          value={item.convocationByStatus.CONFIRMED ?? 0}
          tone="success"
        />
        <Metric
          label="Cancelados"
          value={item.convocationByStatus.CANCELLED ?? 0}
          tone="cancelled"
        />
        <Metric
          label="Sem resposta"
          value={item.convocationByStatus.FINISHED_NO_RESPONSE ?? 0}
          tone="warning"
        />
        <Metric label="Falhas" value={item.convocationByStatus.SEND_ERROR ?? 0} tone="danger" />
      </section>
      <section className="grid-main section-gap">
        <article className="panel">
          <header className="panel-header">
            <div>
              <h2>Programação</h2>
              <span className="muted">Datas calculadas no fuso horário de São Paulo</span>
            </div>
            {item.status === 'DRAFT' ? (
              <button
                className="button secondary small"
                onClick={() => setEditing((value) => !value)}
              >
                {editing ? 'Cancelar edição' : 'Editar rascunho'}
              </button>
            ) : null}
          </header>
          {editing ? (
            <EditForm item={item} saving={saving} onSubmit={save} />
          ) : (
            <div className="panel-body schedule-timeline">
              {schedule.map((entry, index) => (
                <div className="schedule-preview" key={entry.label}>
                  <span className="schedule-index">{index + 1}</span>
                  <div>
                    <small>{entry.label}</small>
                    <strong>{entry.value}</strong>
                    <p>{entry.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
        <aside className="panel">
          <header className="panel-header">
            <div>
              <h2>Situação operacional</h2>
              <span className="muted">Distribuição atual dos pacientes</span>
            </div>
          </header>
          <div className="panel-body status-breakdown">
            {Object.entries(item.convocationByStatus).map(([status, value]) => (
              <Link href={`/convocacoes?campaignId=${item.id}&status=${status}`} key={status}>
                <span>{statusLabel(status)}</span>
                <strong>{value}</strong>
              </Link>
            ))}
          </div>
        </aside>
      </section>
      <section className="panel section-gap">
        <header className="panel-header">
          <div>
            <h2>Histórico administrativo</h2>
            <span className="muted">Ações registradas para esta campanha</span>
          </div>
        </header>
        <div className="panel-body">
          <ol className="timeline">
            {item.recentAudit.map((event) => (
              <li className="timeline-item" key={event.id}>
                <span className="timeline-dot" />
                <span className="timeline-copy">
                  <strong>{auditLabel(event.eventType)}</strong>
                  <small>
                    {formatDateTime(event.createdAt)}
                    {event.user ? ` · ${event.user.name}` : ''}
                  </small>
                </span>
              </li>
            ))}
            {!item.recentAudit.length ? (
              <p className="muted">Nenhuma alteração administrativa registrada.</p>
            ) : null}
          </ol>
        </div>
      </section>
      {confirmSchedule ? (
        <div className="modal-backdrop" onMouseDown={() => !saving && setConfirmSchedule(false)}>
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="modal-header">
              <span className="page-eyebrow">Revisão final</span>
              <h2 id="schedule-title">Programar esta campanha?</h2>
            </header>
            <div className="modal-body">
              <p>
                <strong>{item._count.convocations.toLocaleString('pt-BR')} pacientes</strong>{' '}
                entrarão no fluxo automático.
              </p>
              <div className="schedule-confirm-list">
                {schedule.map((entry) => (
                  <div key={entry.label}>
                    <span>{entry.label}</span>
                    <strong>{entry.value}</strong>
                  </div>
                ))}
              </div>
              <Feedback tone="notice">
                Após programar, datas e intervalos não poderão ser editados. A campanha poderá ser
                pausada ou cancelada.
              </Feedback>
            </div>
            <footer className="modal-actions">
              <button
                className="button secondary"
                disabled={saving}
                onClick={() => setConfirmSchedule(false)}
              >
                Voltar e revisar
              </button>
              <button className="button" disabled={saving} onClick={() => void scheduleCampaign()}>
                {saving ? 'Programando…' : 'Confirmar programação'}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}

function EditForm({
  item,
  saving,
  onSubmit,
}: {
  item: Campaign;
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="panel-body" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="campaign-name">Nome da campanha</label>
        <input id="campaign-name" name="name" defaultValue={item.name} required />
      </div>
      <div className="field">
        <label htmlFor="campaign-first">Primeira convocação</label>
        <input
          id="campaign-first"
          name="firstActionAt"
          type="datetime-local"
          min={toDateTimeLocalValue(new Date())}
          defaultValue={
            item.firstActionAt ? toDateTimeLocalValue(new Date(item.firstActionAt)) : ''
          }
          required
        />
      </div>
      <div className="schedule-fields">
        <div className="field">
          <label htmlFor="campaign-second-days">Dias até a segunda</label>
          <input
            id="campaign-second-days"
            name="secondIntervalDays"
            type="number"
            min="1"
            max="30"
            defaultValue={item.secondIntervalDays ?? 2}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="campaign-second-time">Horário da segunda</label>
          <input
            id="campaign-second-time"
            name="secondStartTime"
            type="time"
            defaultValue={item.secondStartTime ?? '09:00'}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="campaign-third-days">Dias até a terceira</label>
          <input
            id="campaign-third-days"
            name="thirdIntervalDays"
            type="number"
            min="1"
            max="30"
            defaultValue={item.thirdIntervalDays ?? 3}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="campaign-third-time">Horário da terceira</label>
          <input
            id="campaign-third-time"
            name="thirdStartTime"
            type="time"
            defaultValue={item.thirdStartTime ?? '09:00'}
            required
          />
        </div>
      </div>
      <div className="actions">
        <button className="button" disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  );
}
function Metric({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <article className="card compact-metric">
      <span>{label}</span>
      <strong className={tone ? `${tone}-text` : ''}>{value.toLocaleString('pt-BR')}</strong>
    </article>
  );
}
function schedulePreview(item: Campaign) {
  if (!item.firstActionAt) return [];
  const first = new Date(item.firstActionAt);
  const second = withTime(addDays(first, item.secondIntervalDays ?? 0), item.secondStartTime);
  const third = withTime(addDays(second, item.thirdIntervalDays ?? 0), item.thirdStartTime);
  return [
    {
      label: 'Primeira convocação',
      value: formatDateTime(first),
      description: 'Início do processamento da primeira tentativa.',
    },
    {
      label: 'Segunda convocação',
      value: formatDateTime(second),
      description: `${item.secondIntervalDays} dias depois da primeira tentativa.`,
    },
    {
      label: 'Terceira convocação',
      value: formatDateTime(third),
      description: `${item.thirdIntervalDays} dias depois da segunda tentativa.`,
    },
  ];
}
function addDays(value: Date, days: number) {
  const result = new Date(value);
  result.setDate(result.getDate() + days);
  return result;
}
function withTime(value: Date, time: string | null) {
  const result = new Date(value);
  const [hours, minutes] = (time ?? '09:00').split(':').map(Number);
  result.setHours(hours ?? 9, minutes ?? 0, 0, 0);
  return result;
}
function auditLabel(value: string) {
  return (
    (
      {
        CAMPAIGN_CREATED: 'Campanha criada',
        CAMPAIGN_DRAFT_UPDATED: 'Programação alterada',
        CAMPAIGN_SCHEDULED: 'Campanha programada',
        CAMPAIGN_PAUSED: 'Campanha pausada',
        CAMPAIGN_RUNNING: 'Campanha retomada',
        CAMPAIGN_CANCELLED: 'Campanha cancelada',
      } as Record<string, string>
    )[value] ?? 'Campanha atualizada'
  );
}
async function errorOf(response: Response) {
  const data = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
  return Array.isArray(data?.message)
    ? data.message.join(', ')
    : (data?.message ?? 'Não foi possível salvar.');
}
