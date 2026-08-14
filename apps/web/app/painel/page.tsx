'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '../components/navigation';
import { Feedback, Icon, LoadingState } from '../components/ui';
import { authFetch } from '../lib/api';
import { formatDateTime } from '../lib/date-time';
import { stageLabel } from '../lib/labels';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
type Overview = {
  activeCampaigns: number;
  pausedCampaigns: number;
  patientsInProcess: number;
  waitingResponse: number;
  sourceRecords: number;
  messages: number;
  failures: number;
  outcomes: { confirmed: number; cancelled: number; noResponse: number };
  messageByStatus: Record<string, number>;
  stageByStatus: Array<{ stage: string; status: string; count: number }>;
  generatedAt: string;
};
type CampaignOption = { id: string; name: string; status: string };

export default function DashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [campaignId, setCampaignId] = useState('');

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      setError('');
      try {
        const query = new URLSearchParams({ dateFrom, dateTo });
        if (campaignId) query.set('campaignId', campaignId);
        const response = await authFetch(`${API}/dashboard/overview?${query}`);
        if (!response.ok) throw new Error('Não foi possível carregar os indicadores.');
        setData(await response.json());
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : 'Não foi possível carregar os indicadores.',
        );
      } finally {
        setRefreshing(false);
      }
    },
    [campaignId, dateFrom, dateTo],
  );

  useEffect(() => {
    authFetch(`${API}/campaigns/options`)
      .then(async (response) => response.ok && setCampaigns(await response.json()))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const stageSummary = useMemo(() => {
    const result: Record<string, Record<string, number>> = {};
    for (const item of data?.stageByStatus ?? []) {
      result[item.stage] ??= {};
      result[item.stage]![item.status] = item.count;
    }
    return result;
  }, [data]);
  const finalTotal = data
    ? data.outcomes.confirmed + data.outcomes.cancelled + data.outcomes.noResponse
    : 0;

  return (
    <AppShell
      title="Visão geral"
      eyebrow="Operação"
      actions={
        <button className="button secondary" disabled={refreshing} onClick={() => void load()}>
          <Icon name="refresh" />
          {refreshing ? 'Atualizando…' : 'Atualizar'}
        </button>
      }
    >
      <div className="lead-row">
        <p className="content-lead">
          Acompanhe o fluxo de convocações e as ocorrências que exigem atenção.
        </p>
        {data ? (
          <small className="last-updated">Atualizado em {formatDateTime(data.generatedAt)}</small>
        ) : null}
      </div>
      <section className="filter-bar" aria-label="Filtros do painel">
        <div className="field compact">
          <label htmlFor="dashboard-date-from">Data inicial</label>
          <input
            id="dashboard-date-from"
            type="date"
            value={dateFrom}
            max={dateTo}
            onChange={(event) => setDateFrom(event.target.value)}
          />
        </div>
        <div className="field compact">
          <label htmlFor="dashboard-date-to">Data final</label>
          <input
            id="dashboard-date-to"
            type="date"
            value={dateTo}
            min={dateFrom}
            max={today()}
            onChange={(event) => setDateTo(event.target.value)}
          />
        </div>
        <div className="field compact filter-grow">
          <label htmlFor="dashboard-campaign">Campanha</label>
          <select
            id="dashboard-campaign"
            value={campaignId}
            onChange={(event) => setCampaignId(event.target.value)}
          >
            <option value="">Todas as campanhas</option>
            {campaigns.map((campaign) => (
              <option value={campaign.id} key={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </div>
        <div className="quick-filters">
          <button
            className="button secondary small"
            onClick={() => {
              setDateFrom(today());
              setDateTo(today());
            }}
          >
            Hoje
          </button>
          <button
            className="button secondary small"
            onClick={() => {
              setDateFrom(daysAgo(6));
              setDateTo(today());
            }}
          >
            7 dias
          </button>
          <button
            className="button secondary small"
            onClick={() => {
              setDateFrom(firstDayOfMonth());
              setDateTo(today());
            }}
          >
            Este mês
          </button>
        </div>
      </section>
      {error ? (
        <Feedback tone="error">
          {error}{' '}
          <button className="inline-action" onClick={() => void load()}>
            Tentar novamente
          </button>
        </Feedback>
      ) : null}
      {!data ? (
        <section className="panel">
          <LoadingState label="Consolidando os dados operacionais…" />
        </section>
      ) : (
        <>
          <section className="grid dashboard-metrics">
            <Metric
              label="Campanhas ativas"
              value={data.activeCampaigns}
              meta={`${data.pausedCampaigns} pausadas`}
              icon="send"
            />
            <Metric
              label="Pacientes em processo"
              value={data.patientsInProcess}
              meta="ainda não finalizados"
              icon="users"
            />
            <Metric
              label="Mensagens no período"
              value={data.messages}
              meta={`${data.sourceRecords} registros de origem`}
              icon="message"
            />
            <Metric
              label="Ocorrências para revisar"
              value={data.failures}
              meta="pacientes com falha"
              icon="alert"
              tone={data.failures ? 'danger' : undefined}
            />
          </section>
          <section className="grid-main section-gap">
            <article className="panel">
              <header className="panel-header">
                <div>
                  <h2>Resultados no período</h2>
                  <span className="muted">Percentuais calculados sobre fluxos finalizados</span>
                </div>
                <Link className="table-link" href="/convocacoes">
                  Ver pacientes →
                </Link>
              </header>
              <div className="panel-body metric-list">
                <Progress
                  label="Confirmados"
                  value={data.outcomes.confirmed}
                  total={finalTotal}
                  color="var(--success)"
                />
                <Progress
                  label="Cancelados"
                  value={data.outcomes.cancelled}
                  total={finalTotal}
                  color="var(--cancelled)"
                />
                <Progress
                  label="Sem resposta"
                  value={data.outcomes.noResponse}
                  total={finalTotal}
                  color="var(--warning)"
                />
              </div>
            </article>
            <article className="panel">
              <header className="panel-header">
                <div>
                  <h2>Atenção operacional</h2>
                  <span className="muted">Atalhos para itens acionáveis</span>
                </div>
              </header>
              <div className="panel-body">
                <Attention
                  label="Falhas de envio"
                  value={data.failures}
                  href="/convocacoes?status=SEND_ERROR"
                  danger
                />
                <Attention
                  label="Aguardando resposta"
                  value={data.waitingResponse}
                  href="/convocacoes?status=WAITING_RESPONSE"
                />
                <Attention
                  label="Campanhas pausadas"
                  value={data.pausedCampaigns}
                  href="/campanhas?status=PAUSED"
                />
              </div>
            </article>
          </section>
          <section className="panel section-gap">
            <header className="panel-header">
              <div>
                <h2>Mensagens por etapa</h2>
                <span className="muted">Situação das tentativas no período selecionado</span>
              </div>
            </header>
            <div className="stage-overview">
              {['FIRST', 'SECOND', 'THIRD'].map((stage) => (
                <StageCard key={stage} stage={stage} values={stageSummary[stage] ?? {}} />
              ))}
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}

function Metric({
  label,
  value,
  meta,
  icon,
  tone,
}: {
  label: string;
  value: number;
  meta: string;
  icon: string;
  tone?: string;
}) {
  return (
    <article className="card stat-card">
      <div className="stat-copy">
        <span className="stat-label">{label}</span>
        <strong className="stat-value">{value.toLocaleString('pt-BR')}</strong>
        <small className="stat-meta">{meta}</small>
      </div>
      <span className={`stat-icon ${tone ?? ''}`}>
        <Icon name={icon} />
      </span>
    </article>
  );
}
function Progress({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percent = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="metric-row">
      <span>{label}</span>
      <span className="progress">
        <i style={{ width: `${percent}%`, background: color }} />
      </span>
      <strong>
        {value} <small>{percent}%</small>
      </strong>
    </div>
  );
}
function Attention({
  label,
  value,
  href,
  danger,
}: {
  label: string;
  value: number;
  href: string;
  danger?: boolean;
}) {
  return (
    <Link className="attention-row" href={href}>
      <span>{label}</span>
      <strong className={danger ? 'danger-text' : ''}>{value}</strong>
      <Icon name="chevron" />
    </Link>
  );
}
function StageCard({ stage, values }: { stage: string; values: Record<string, number> }) {
  return (
    <article className="stage-card">
      <div className="stage-card-heading">
        <span className="schedule-index">{stage === 'FIRST' ? 1 : stage === 'SECOND' ? 2 : 3}</span>
        <strong>{stageLabel(stage)}</strong>
      </div>
      <dl>
        <StageValue label="Aceitas" value={values.SUBMITTED ?? 0} />
        <StageValue label="Enviadas" value={values.SENT ?? 0} />
        <StageValue label="Entregues" value={values.DELIVERED ?? 0} />
        <StageValue label="Lidas" value={values.READ ?? 0} />
        <StageValue label="Falhas" value={values.FAILED ?? 0} danger />
      </dl>
    </article>
  );
}
function StageValue({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={danger && value ? 'danger-text' : ''}>{value.toLocaleString('pt-BR')}</dd>
    </div>
  );
}
function toInputDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}
function today() {
  return toInputDate(new Date());
}
function daysAgo(days: number) {
  const value = new Date();
  value.setDate(value.getDate() - days);
  return toInputDate(value);
}
function firstDayOfMonth() {
  const value = new Date();
  value.setDate(1);
  return toInputDate(value);
}
