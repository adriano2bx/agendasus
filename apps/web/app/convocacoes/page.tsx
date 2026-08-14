'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { AppShell } from '../components/navigation';
import {
  EmptyState,
  Feedback,
  Icon,
  LoadingState,
  Pagination,
  StatusBadge,
} from '../components/ui';
import { authFetch } from '../lib/api';
import { formatDateTime } from '../lib/date-time';
import { stageLabel } from '../lib/labels';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
type Item = {
  id: string;
  stage: string;
  status: string;
  nextActionAt: string | null;
  selectedPhone: { normalizedValue: string } | null;
  patient: { displayName: string; phones: Array<{ normalizedValue: string }> };
  campaign: { id: string; name: string };
  messages: Array<{ status: string; createdAt: string; submittedAt?: string | null }>;
};
type Campaign = { id: string; name: string };
type PageData = { page: number; limit: number; total: number; pages: number };

export default function ConvocationsPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="Convocações" eyebrow="Pacientes">
          <section className="panel">
            <LoadingState label="Carregando convocações…" />
          </section>
        </AppShell>
      }
    >
      <ConvocationsContent />
    </Suspense>
  );
}

function ConvocationsContent() {
  const initial = useSearchParams();
  const [items, setItems] = useState<Item[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pagination, setPagination] = useState<PageData>({
    page: 1,
    limit: 25,
    total: 0,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState(initial.get('query') ?? '');
  const [status, setStatus] = useState(initial.get('status') ?? '');
  const [stage, setStage] = useState(initial.get('stage') ?? '');
  const [campaignId, setCampaignId] = useState(initial.get('campaignId') ?? '');
  const [procedure, setProcedure] = useState(initial.get('procedure') ?? '');
  const [dateFrom, setDateFrom] = useState(initial.get('dateFrom') ?? '');
  const [dateTo, setDateTo] = useState(initial.get('dateTo') ?? '');
  const [expandedFilters, setExpandedFilters] = useState(
    Boolean(stage || campaignId || procedure || dateFrom || dateTo),
  );

  const load = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(pagination.limit) });
        for (const [key, value] of Object.entries({
          query: query.trim(),
          status,
          stage,
          campaignId,
          procedure: procedure.trim(),
          dateFrom,
          dateTo,
        }))
          if (value) params.set(key, value);
        window.history.replaceState(null, '', `/convocacoes?${params}`);
        const response = await authFetch(`${API}/convocations?${params}`);
        if (!response.ok) throw new Error('Não foi possível carregar as convocações.');
        const result = await response.json();
        setItems(result.items);
        setPagination(result.pagination);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : 'Não foi possível carregar as convocações.',
        );
      } finally {
        setLoading(false);
      }
    },
    [campaignId, dateFrom, dateTo, pagination.limit, procedure, query, stage, status],
  );

  useEffect(() => {
    authFetch(`${API}/campaigns/options`)
      .then(async (response) => response.ok && setCampaigns(await response.json()))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(1), 250);
    return () => window.clearTimeout(timer);
  }, [query, status, stage, campaignId, procedure, dateFrom, dateTo]);
  const hasFilters = Boolean(
    query || status || stage || campaignId || procedure || dateFrom || dateTo,
  );
  function clearFilters() {
    setQuery('');
    setStatus('');
    setStage('');
    setCampaignId('');
    setProcedure('');
    setDateFrom('');
    setDateTo('');
  }

  return (
    <AppShell title="Convocações" eyebrow="Pacientes">
      <p className="content-lead">
        Consulte a situação, as tentativas e a próxima ação de cada paciente.
      </p>
      {error ? (
        <Feedback tone="error">
          {error}{' '}
          <button className="inline-action" onClick={() => void load()}>
            Tentar novamente
          </button>
        </Feedback>
      ) : null}
      <section className="panel">
        <div className="table-toolbar">
          <div className="input-with-icon toolbar-search">
            <Icon name="search" />
            <input
              className="input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Paciente, CPF, campanha ou código"
              aria-label="Buscar convocação"
            />
          </div>
          <div className="table-tools">
            <select
              className="input toolbar-select"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Filtrar por situação"
            >
              <option value="">Todas as situações</option>
              <option value="SCHEDULED">Programadas</option>
              <option value="WAITING_RESPONSE">Aguardando resposta</option>
              <option value="CONFIRMED">Confirmadas</option>
              <option value="CANCELLED">Canceladas</option>
              <option value="SEND_ERROR">Falhas</option>
              <option value="FINISHED_NO_RESPONSE">Sem resposta</option>
            </select>
            <button
              className={`button secondary${expandedFilters ? ' active-filter' : ''}`}
              onClick={() => setExpandedFilters((value) => !value)}
            >
              <Icon name="filter" />
              Filtros {hasFilters ? '·' : ''}
            </button>
          </div>
        </div>
        {expandedFilters ? (
          <div className="advanced-filters">
            <div className="field compact">
              <label htmlFor="filter-campaign">Campanha</label>
              <select
                id="filter-campaign"
                value={campaignId}
                onChange={(event) => setCampaignId(event.target.value)}
              >
                <option value="">Todas</option>
                {campaigns.map((campaign) => (
                  <option value={campaign.id} key={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field compact">
              <label htmlFor="filter-stage">Etapa</label>
              <select
                id="filter-stage"
                value={stage}
                onChange={(event) => setStage(event.target.value)}
              >
                <option value="">Todas</option>
                <option value="FIRST">1ª convocação</option>
                <option value="SECOND">2ª convocação</option>
                <option value="THIRD">3ª convocação</option>
                <option value="FINISHED">Finalizada</option>
              </select>
            </div>
            <div className="field compact">
              <label htmlFor="filter-procedure">Procedimento</label>
              <input
                id="filter-procedure"
                value={procedure}
                onChange={(event) => setProcedure(event.target.value)}
                placeholder="Ex.: PET-CT"
              />
            </div>
            <div className="field compact">
              <label htmlFor="filter-from">De</label>
              <input
                id="filter-from"
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </div>
            <div className="field compact">
              <label htmlFor="filter-to">Até</label>
              <input
                id="filter-to"
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </div>
            <button
              className="button secondary small clear-filter"
              disabled={!hasFilters}
              onClick={clearFilters}
            >
              Limpar filtros
            </button>
          </div>
        ) : null}
        {loading ? (
          <LoadingState label="Carregando convocações…" />
        ) : items.length ? (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Campanha</th>
                    <th>Etapa</th>
                    <th>Situação</th>
                    <th>Próxima ação</th>
                    <th>Última mensagem</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const latest = item.messages[0];
                    const phone =
                      item.selectedPhone?.normalizedValue ??
                      item.patient.phones[0]?.normalizedValue;
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="cell-main">
                            <Link className="table-link" href={`/convocacoes/${item.id}`}>
                              {item.patient.displayName}
                            </Link>
                            <small>{formatPhone(phone)}</small>
                          </div>
                        </td>
                        <td>
                          <Link className="subtle-link" href={`/campanhas/${item.campaign.id}`}>
                            {item.campaign.name}
                          </Link>
                        </td>
                        <td>
                          <span className="badge">{stageLabel(item.stage)}</span>
                        </td>
                        <td>
                          <StatusBadge value={item.status} />
                        </td>
                        <td>{item.nextActionAt ? formatDateTime(item.nextActionAt) : '—'}</td>
                        <td>
                          {latest ? (
                            <div className="cell-main">
                              <StatusBadge value={latest.status} />
                              <small>
                                {formatDateTime(latest.submittedAt ?? latest.createdAt)}
                              </small>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          <Link
                            className="icon-button"
                            aria-label={`Abrir convocação de ${item.patient.displayName}`}
                            href={`/convocacoes/${item.id}`}
                          >
                            <Icon name="chevron" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination {...pagination} onPage={(page) => void load(page)} />
          </>
        ) : (
          <EmptyState
            icon="users"
            title="Nenhuma convocação encontrada"
            description={
              hasFilters
                ? 'Nenhum paciente corresponde aos filtros selecionados.'
                : 'As convocações aparecerão quando uma campanha for criada.'
            }
            action={
              hasFilters ? (
                <button className="button secondary" onClick={clearFilters}>
                  Limpar filtros
                </button>
              ) : undefined
            }
          />
        )}
      </section>
    </AppShell>
  );
}
function formatPhone(value?: string) {
  if (!value) return 'Sem telefone selecionado';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55'))
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  if (digits.length === 12 && digits.startsWith('55'))
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  return `+${digits}`;
}
