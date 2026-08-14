'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
  _count: { convocations: number };
};
type PaginationData = { page: number; limit: number; total: number; pages: number };

export default function CampaignsPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="Campanhas" eyebrow="Operação">
          <section className="panel">
            <LoadingState label="Carregando campanhas…" />
          </section>
        </AppShell>
      }
    >
      <CampaignsContent />
    </Suspense>
  );
}

function CampaignsContent() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Campaign[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 25,
    total: 0,
    pages: 1,
  });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    tone: 'success' | 'error' | 'notice';
    text: string;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    campaign: Campaign;
    operation: 'pause' | 'resume' | 'cancel';
  } | null>(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(
    async (page = pagination.page) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(pagination.limit) });
        if (query.trim()) params.set('query', query.trim());
        if (status) params.set('status', status);
        const response = await authFetch(`${API}/campaigns?${params}`);
        if (!response.ok) throw new Error('Não foi possível carregar as campanhas.');
        const result = await response.json();
        setItems(result.items);
        setPagination(result.pagination);
      } catch (cause) {
        setMessage({
          tone: 'error',
          text: cause instanceof Error ? cause.message : 'Não foi possível carregar as campanhas.',
        });
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit, pagination.page, query, status],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void load(1), 250);
    return () => window.clearTimeout(timer);
  }, [query, status]);

  async function confirmAction() {
    if (!pendingAction) return;
    setWorking(true);
    setMessage(null);
    try {
      const response = await authFetch(
        `${API}/campaigns/${pendingAction.campaign.id}/${pendingAction.operation}`,
        { method: 'POST' },
      );
      if (!response.ok) throw new Error(await errorOf(response));
      const result = await response.json();
      setMessage({
        tone: 'success',
        text:
          pendingAction.operation === 'resume' && result.pendingDue
            ? `Campanha retomada. ${result.pendingDue} convocações vencidas voltarão ao processamento.`
            : actionSuccess(pendingAction.operation),
      });
      setPendingAction(null);
      await load();
    } catch (cause) {
      setMessage({
        tone: 'error',
        text: cause instanceof Error ? cause.message : 'Não foi possível atualizar a campanha.',
      });
    } finally {
      setWorking(false);
    }
  }

  return (
    <AppShell
      title="Campanhas"
      eyebrow="Operação"
      actions={
        <Link className="button" href="/importacoes">
          <Icon name="plus" />
          Nova campanha
        </Link>
      }
    >
      <p className="content-lead">
        Acompanhe a programação e controle a execução sem perder o histórico.
      </p>
      {message ? <Feedback tone={message.tone}>{message.text}</Feedback> : null}
      <section className="panel">
        <header className="panel-header">
          <div>
            <h2>Todas as campanhas</h2>
            <span className="muted">
              {pagination.total.toLocaleString('pt-BR')} campanhas cadastradas
            </span>
          </div>
        </header>
        <div className="table-toolbar">
          <div className="input-with-icon toolbar-search">
            <Icon name="search" />
            <input
              className="input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nome da campanha"
              aria-label="Buscar campanha"
            />
          </div>
          <select
            className="input toolbar-select"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filtrar por situação"
          >
            <option value="">Todas as situações</option>
            <option value="DRAFT">Rascunho</option>
            <option value="SCHEDULED">Programada</option>
            <option value="RUNNING">Em andamento</option>
            <option value="PAUSED">Pausada</option>
            <option value="COMPLETED">Concluída</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
        </div>
        {loading ? (
          <LoadingState label="Carregando campanhas…" />
        ) : items.length ? (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Campanha</th>
                    <th>Pacientes</th>
                    <th>Primeira convocação</th>
                    <th>Próximas convocações</th>
                    <th>Situação</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="cell-main">
                          <Link className="table-link" href={`/campanhas/${item.id}`}>
                            {item.name}
                          </Link>
                          <small>Criada a partir de uma importação SISREG</small>
                        </div>
                      </td>
                      <td>
                        <strong>{item._count.convocations}</strong>
                      </td>
                      <td>{item.firstActionAt ? formatDateTime(item.firstActionAt) : '—'}</td>
                      <td>
                        <div className="cell-main">
                          <span>
                            2ª: +{item.secondIntervalDays ?? '—'} dias às{' '}
                            {item.secondStartTime ?? '—'}
                          </span>
                          <small>
                            3ª: +{item.thirdIntervalDays ?? '—'} dias às{' '}
                            {item.thirdStartTime ?? '—'}
                          </small>
                        </div>
                      </td>
                      <td>
                        <StatusBadge value={item.status} />
                      </td>
                      <td>
                        <CampaignActions
                          item={item}
                          onAction={(operation) => setPendingAction({ campaign: item, operation })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination {...pagination} onPage={(page) => void load(page)} />
          </>
        ) : (
          <EmptyState
            icon="send"
            title="Nenhuma campanha encontrada"
            description={
              query || status
                ? 'Altere os filtros para ampliar a busca.'
                : 'Aprove uma importação para configurar a primeira campanha.'
            }
            action={
              !query && !status ? (
                <Link className="button" href="/importacoes">
                  Iniciar importação
                </Link>
              ) : undefined
            }
          />
        )}
      </section>
      {pendingAction ? (
        <Confirmation
          action={pendingAction}
          working={working}
          onClose={() => !working && setPendingAction(null)}
          onConfirm={() => void confirmAction()}
        />
      ) : null}
    </AppShell>
  );
}

function CampaignActions({
  item,
  onAction,
}: {
  item: Campaign;
  onAction: (operation: 'pause' | 'resume' | 'cancel') => void;
}) {
  return (
    <div className="actions">
      <Link
        className={`button ${item.status === 'DRAFT' ? '' : 'secondary'} small`}
        href={`/campanhas/${item.id}`}
      >
        {item.status === 'DRAFT' ? 'Revisar e programar' : 'Abrir'}
      </Link>
      {['SCHEDULED', 'RUNNING'].includes(item.status) ? (
        <button className="button secondary small" onClick={() => onAction('pause')}>
          Pausar
        </button>
      ) : null}
      {item.status === 'PAUSED' ? (
        <button className="button small" onClick={() => onAction('resume')}>
          Retomar
        </button>
      ) : null}
      {!['CANCELLED', 'COMPLETED'].includes(item.status) ? (
        <button className="button danger ghost small" onClick={() => onAction('cancel')}>
          Cancelar
        </button>
      ) : null}
    </div>
  );
}
function Confirmation({
  action,
  working,
  onClose,
  onConfirm,
}: {
  action: { campaign: Campaign; operation: string };
  working: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const destructive = action.operation === 'cancel';
  const titles: Record<string, string> = {
    pause: 'Pausar campanha',
    resume: 'Retomar campanha',
    cancel: 'Cancelar campanha',
  };
  const texts: Record<string, string> = {
    pause: 'Novos disparos serão suspensos. Respostas e webhooks continuarão sendo processados.',
    resume: 'Convocações vencidas e ainda elegíveis voltarão automaticamente para a fila.',
    cancel:
      'Nenhum novo disparo será realizado. Mensagens, respostas e histórico permanecerão armazenados.',
  };
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-confirm-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <span className="page-eyebrow">Ação de campanha</span>
          <h2 id="campaign-confirm-title">{titles[action.operation]}</h2>
        </header>
        <div className="modal-body">
          <p>
            Campanha: <strong>{action.campaign.name}</strong>
          </p>
          <p className="muted">{texts[action.operation]}</p>
        </div>
        <footer className="modal-actions">
          <button className="button secondary" disabled={working} onClick={onClose}>
            Voltar
          </button>
          <button
            className={`button ${destructive ? 'danger' : ''}`}
            disabled={working}
            onClick={onConfirm}
          >
            {working ? 'Processando…' : titles[action.operation]}
          </button>
        </footer>
      </section>
    </div>
  );
}
function actionSuccess(operation: string) {
  return (
    (
      {
        pause: 'Campanha pausada com sucesso.',
        resume: 'Campanha retomada com sucesso.',
        cancel: 'Campanha cancelada com sucesso.',
      } as Record<string, string>
    )[operation] ?? 'Campanha atualizada.'
  );
}
async function errorOf(response: Response) {
  const data = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
  return Array.isArray(data?.message)
    ? data.message.join(', ')
    : (data?.message ?? 'Não foi possível atualizar a campanha.');
}
