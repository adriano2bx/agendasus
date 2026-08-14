'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '../components/navigation';
import { EmptyState, Icon } from '../components/ui';
import { authFetch } from '../lib/api';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
type Overview = {
  activeCampaigns: number;
  convocations: number;
  messages: number;
  convocationByStatus: Record<string, number>;
  messageByStatus: Record<string, number>;
  stageByStatus?: Array<{ stage: string; status: string; _count: { _all: number } }>;
};

export default function DashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    authFetch(`${API}/dashboard/overview`)
      .then(async (response) =>
        response.ok
          ? setData(await response.json())
          : setError('Não foi possível carregar o painel.'),
      )
      .catch(() => setError('Não foi possível carregar o painel.'));
  }, []);

  const confirmed = data?.convocationByStatus.CONFIRMED ?? 0;
  const cancelled = data?.convocationByStatus.CANCELLED ?? 0;
  const waiting = data?.convocationByStatus.WAITING_RESPONSE ?? 0;
  const failed = (data?.convocationByStatus.SEND_ERROR ?? 0) + (data?.messageByStatus.FAILED ?? 0);
  const finalTotal = Math.max(
    confirmed + cancelled + (data?.convocationByStatus.FINISHED_NO_RESPONSE ?? 0),
    1,
  );

  return (
    <AppShell title="Visão geral" eyebrow="Operação de hoje">
      <p className="content-lead">
        Acompanhe campanhas, respostas e ocorrências que precisam de atenção.
      </p>
      {error ? (
        <p className="error">
          <Icon name="alert" />
          {error}
        </p>
      ) : null}
      {!data ? (
        <div className="panel">
          <EmptyState
            title="Carregando indicadores"
            description="Estamos consolidando os dados operacionais."
          />
        </div>
      ) : (
        <>
          <section className="grid">
            <Metric
              label="Campanhas ativas"
              value={data.activeCampaigns}
              meta="em execução ou programadas"
              icon="send"
            />
            <Metric
              label="Pacientes em processo"
              value={data.convocations}
              meta="convocações no período"
              icon="users"
            />
            <Metric
              label="Aguardando resposta"
              value={waiting}
              meta="próxima convocação monitorada"
              icon="clock"
              tone="warning"
            />
            <Metric
              label="Falhas para revisar"
              value={failed}
              meta="mensagens ou convocações"
              icon="alert"
              tone="danger"
            />
          </section>
          <section className="grid-main section-gap">
            <article className="panel">
              <header className="panel-header">
                <h2>Resultado das convocações</h2>
                <Link className="table-link" href="/convocacoes">
                  Ver todas →
                </Link>
              </header>
              <div className="panel-body metric-list">
                <Progress
                  label="Confirmados"
                  value={confirmed}
                  total={finalTotal}
                  color="var(--success)"
                />
                <Progress
                  label="Cancelados"
                  value={cancelled}
                  total={finalTotal}
                  color="var(--danger)"
                />
                <Progress
                  label="Sem resposta"
                  value={data.convocationByStatus.FINISHED_NO_RESPONSE ?? 0}
                  total={finalTotal}
                  color="var(--warning)"
                />
              </div>
            </article>
            <article className="panel">
              <header className="panel-header">
                <h2>Atenção operacional</h2>
              </header>
              <div className="panel-body">
                <Attention label="Falhas de envio" value={failed} href="/convocacoes" danger />
                <Attention label="Aguardando resposta" value={waiting} href="/convocacoes" />
                <Attention
                  label="Campanhas ativas"
                  value={data.activeCampaigns}
                  href="/campanhas"
                />
              </div>
            </article>
          </section>
          <section className="panel section-gap">
            <header className="panel-header">
              <h2>Mensagens por situação</h2>
            </header>
            <div className="panel-body grid">
              {Object.entries(data.messageByStatus).map(([status, value]) => (
                <div className="cell-main" key={status}>
                  <span className="stat-label">{messageLabel(status)}</span>
                  <strong className="stat-value" style={{ fontSize: 22 }}>
                    {value}
                  </strong>
                </div>
              ))}
              {Object.keys(data.messageByStatus).length === 0 ? (
                <p className="muted">Nenhuma mensagem processada ainda.</p>
              ) : null}
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
  const percent = Math.round((value / total) * 100);
  return (
    <div className="metric-row">
      <span>{label}</span>
      <span className="progress">
        <i style={{ width: `${percent}%`, background: color }} />
      </span>
      <strong>{value}</strong>
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
    <Link
      className="row"
      href={href}
      style={{ gridTemplateColumns: '1fr auto', textDecoration: 'none' }}
    >
      <span>{label}</span>
      <strong style={{ color: danger ? 'var(--danger)' : 'var(--navy)' }}>{value}</strong>
    </Link>
  );
}
function messageLabel(value: string) {
  return (
    (
      {
        QUEUED: 'Na fila',
        PROCESSING: 'Em processamento',
        SUBMITTED: 'Aceitas pelo provedor',
        SENT: 'Enviadas',
        DELIVERED: 'Entregues',
        READ: 'Lidas',
        FAILED: 'Falhas',
      } as Record<string, string>
    )[value] ?? 'Situação não identificada'
  );
}
