'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../components/navigation';
import { EmptyState, Feedback, Icon, LoadingState, Pagination } from '../components/ui';
import { authFetch } from '../lib/api';
import { formatDateTime } from '../lib/date-time';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

type AuditUser = { id: string; name: string; email: string; role: 'ADMIN' | 'OPERATOR' };
type AuditEntry = {
  id: string;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  previousData: unknown;
  newData: unknown;
  reason: string | null;
  metadata: unknown;
  createdAt: string;
  user: AuditUser | null;
};
type AuditResponse = {
  items: AuditEntry[];
  pagination: { page: number; limit: number; total: number; pages: number };
  filters: { users: AuditUser[]; eventTypes: string[] };
};

export default function AuditPage() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [userId, setUserId] = useState('');
  const [eventType, setEventType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditEntry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (query.trim()) params.set('query', query.trim());
      if (userId) params.set('userId', userId);
      if (eventType) params.set('eventType', eventType);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const response = await authFetch(`${API}/audit?${params}`);
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message ?? 'Não foi possível carregar a auditoria.');
      setData(body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a auditoria.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, eventType, page, query, userId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  function changeFilter(change: () => void) {
    setPage(1);
    change();
  }

  return (
    <AppShell title="Auditoria" eyebrow="Administração">
      <p className="content-lead">
        Consulte acessos, alterações operacionais e eventos automáticos com identificação do
        responsável.
      </p>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      <section className="panel">
        <header className="panel-header">
          <div>
            <h2>Histórico de atividades</h2>
            <span className="muted">
              {(data?.pagination.total ?? 0).toLocaleString('pt-BR')} evento(s) encontrado(s)
            </span>
          </div>
        </header>
        <div className="audit-filters">
          <div className="input-with-icon audit-search">
            <Icon name="search" />
            <input
              className="input"
              value={query}
              onChange={(event) => changeFilter(() => setQuery(event.target.value))}
              placeholder="Buscar ação, entidade, usuário ou motivo"
              aria-label="Buscar na auditoria"
            />
          </div>
          <select
            className="input"
            value={userId}
            onChange={(event) => changeFilter(() => setUserId(event.target.value))}
            aria-label="Filtrar por usuário"
          >
            <option value="">Todos os responsáveis</option>
            {data?.filters.users.map((user) => (
              <option value={user.id} key={user.id}>
                {user.name} · {user.role === 'ADMIN' ? 'Administrador' : 'Operador'}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={eventType}
            onChange={(event) => changeFilter(() => setEventType(event.target.value))}
            aria-label="Filtrar por ação"
          >
            <option value="">Todas as ações</option>
            {data?.filters.eventTypes.map((event) => (
              <option value={event} key={event}>
                {eventLabel(event)}
              </option>
            ))}
          </select>
          <label className="audit-date-field">
            <span>De</span>
            <input
              className="input"
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(event) => changeFilter(() => setDateFrom(event.target.value))}
            />
          </label>
          <label className="audit-date-field">
            <span>Até</span>
            <input
              className="input"
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(event) => changeFilter(() => setDateTo(event.target.value))}
            />
          </label>
        </div>
        {loading && !data ? (
          <LoadingState label="Carregando histórico…" />
        ) : data?.items.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data e hora</th>
                  <th>Responsável</th>
                  <th>Ação</th>
                  <th>Registro</th>
                  <th>Motivo</th>
                  <th>
                    <span className="sr-only">Detalhes</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDateTime(entry.createdAt)}</td>
                    <td>
                      <div className="cell-main">
                        <strong>{entry.user?.name ?? 'Sistema'}</strong>
                        <small>{entry.user?.email ?? 'Evento automático'}</small>
                      </div>
                    </td>
                    <td>
                      <strong>{eventLabel(entry.eventType)}</strong>
                    </td>
                    <td>
                      <div className="cell-main">
                        <span>{entityLabel(entry.entityType)}</span>
                        <small>{shortId(entry.entityId)}</small>
                      </div>
                    </td>
                    <td>{entry.reason || '—'}</td>
                    <td>
                      <button className="button secondary small" onClick={() => setSelected(entry)}>
                        Ver detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon="report"
            title="Nenhum evento encontrado"
            description="Ajuste os filtros para consultar outro período ou atividade."
          />
        )}
        {data ? (
          <Pagination
            page={data.pagination.page}
            pages={data.pagination.pages}
            total={data.pagination.total}
            limit={data.pagination.limit}
            onPage={setPage}
          />
        ) : null}
      </section>
      {selected ? <AuditDetail entry={selected} onClose={() => setSelected(null)} /> : null}
    </AppShell>
  );
}

function AuditDetail({ entry, onClose }: { entry: AuditEntry; onClose: () => void }) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <article className="modal modal-wide" role="dialog" aria-modal="true">
        <header className="panel-header">
          <div>
            <h2>{eventLabel(entry.eventType)}</h2>
            <span className="muted">{formatDateTime(entry.createdAt)}</span>
          </div>
          <button className="icon-button" aria-label="Fechar" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        <div className="panel-body audit-detail-grid">
          <AuditValue label="Responsável" value={entry.user?.name ?? 'Sistema'} />
          <AuditValue label="E-mail" value={entry.user?.email ?? '—'} />
          <AuditValue label="Tipo de registro" value={entityLabel(entry.entityType)} />
          <AuditValue label="Identificador" value={entry.entityId ?? '—'} />
          {entry.reason ? <AuditValue label="Motivo" value={entry.reason} wide /> : null}
          <JsonBlock label="Dados anteriores" value={entry.previousData} />
          <JsonBlock label="Novos dados" value={entry.newData} />
          <JsonBlock label="Informações adicionais" value={entry.metadata} />
        </div>
        <footer className="modal-actions">
          <button className="button secondary" onClick={onClose}>
            Fechar
          </button>
        </footer>
      </article>
    </div>
  );
}

function AuditValue({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={`audit-detail-value${wide ? ' wide' : ''}`}>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  return (
    <section className="audit-json-block">
      <h3>{label}</h3>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </section>
  );
}

function shortId(value: string | null) {
  if (!value) return 'Sem identificador';
  return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

function entityLabel(value: string | null) {
  return (
    {
      user: 'Usuário',
      import: 'Importação',
      import_row: 'Registro importado',
      campaign: 'Campanha',
      convocation: 'Convocação',
      message: 'Mensagem',
      handoff: 'Transbordo',
    }[value ?? ''] ??
    value ??
    'Sistema'
  );
}

function eventLabel(value: string) {
  return (
    {
      LOGIN_SUCCESS: 'Login realizado',
      LOGOUT: 'Sessão encerrada',
      ADMIN_BOOTSTRAP_PROVISIONED: 'Administrador provisionado',
      OPERATOR_CREATED: 'Operador criado',
      OPERATOR_UPDATED: 'Operador atualizado',
      IMPORT_UPLOADED: 'PDF enviado',
      IMPORT_ROW_UPDATED: 'Registro da importação alterado',
      IMPORT_APPROVED: 'Importação aprovada',
      CAMPAIGN_CREATED: 'Campanha criada',
      CAMPAIGN_DRAFT_UPDATED: 'Programação alterada',
      CAMPAIGN_SCHEDULED: 'Campanha programada',
      CAMPAIGN_RUNNING: 'Campanha retomada',
      CAMPAIGN_PAUSED: 'Campanha pausada',
      CAMPAIGN_CANCELLED: 'Campanha cancelada',
      CONVOCATION_PHONE_CHANGED: 'Telefone da convocação alterado',
      CONVOCATION_STATUS_CHANGED_MANUALLY: 'Situação alterada manualmente',
      CONVOCATION_FINISHED_NO_RESPONSE: 'Convocação finalizada sem resposta',
      PATIENT_RESPONSE_RECEIVED: 'Resposta do paciente recebida',
      PATIENT_CONFIRMED: 'Paciente confirmado',
      PATIENT_CANCELLED: 'Paciente cancelou',
      PATIENT_HANDOFF_SUBMITTED: 'Transbordo enviado',
      PATIENT_HANDOFF_FAILED: 'Falha no transbordo',
    }[value] ?? value.replaceAll('_', ' ').toLocaleLowerCase('pt-BR')
  );
}
