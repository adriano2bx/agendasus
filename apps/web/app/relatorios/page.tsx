'use client';

import { useState } from 'react';
import { AppShell } from '../components/navigation';
import { Icon } from '../components/ui';
import { authFetch } from '../lib/api';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export default function ReportsPage() {
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => firstDayOfCurrentMonth());
  const [dateTo, setDateTo] = useState(() => today());

  async function download(path: string, name: string) {
    if (!dateFrom || !dateTo) {
      setMessageIsError(true);
      setMessage('Selecione a data inicial e a data final.');
      return;
    }
    if (dateFrom > dateTo) {
      setMessageIsError(true);
      setMessage('A data inicial não pode ser posterior à data final.');
      return;
    }

    setMessageIsError(false);
    setMessage('Gerando arquivo…');
    const query = new URLSearchParams({ dateFrom, dateTo });
    const response = await authFetch(`${API}/reports/${path}?${query.toString()}`);
    if (!response.ok) {
      setMessageIsError(true);
      setMessage('Não foi possível gerar o relatório.');
      return;
    }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = datedFileName(name, dateFrom, dateTo);
    link.click();
    URL.revokeObjectURL(url);
    setMessage('Arquivo gerado. A transferência foi iniciada.');
  }

  return (
    <AppShell title="Relatórios" eyebrow="Análise operacional">
      <p className="content-lead">
        Exporte dados operacionais para conferência, acompanhamento e prestação de contas da
        operação.
      </p>
      <section className="panel report-period-panel">
        <header className="panel-header">
          <div>
            <h2>Período dos relatórios</h2>
            <span className="muted">Defina o intervalo que será considerado nas exportações</span>
          </div>
          <span className="badge">Fuso horário de São Paulo</span>
        </header>
        <div className="report-period-body">
          <div className="field">
            <label htmlFor="report-date-from">Data inicial</label>
            <input
              id="report-date-from"
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(event) => setDateFrom(event.target.value)}
              required
            />
          </div>
          <span className="date-range-separator" aria-hidden="true">
            até
          </span>
          <div className="field">
            <label htmlFor="report-date-to">Data final</label>
            <input
              id="report-date-to"
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              max={today()}
              onChange={(event) => setDateTo(event.target.value)}
              required
            />
          </div>
          <div className="report-period-shortcuts" aria-label="Atalhos de período">
            <button
              className="button secondary small"
              type="button"
              onClick={() => {
                setDateFrom(firstDayOfCurrentMonth());
                setDateTo(today());
              }}
            >
              Este mês
            </button>
            <button
              className="button secondary small"
              type="button"
              onClick={() => {
                setDateFrom(daysAgo(29));
                setDateTo(today());
              }}
            >
              Últimos 30 dias
            </button>
          </div>
        </div>
        <p className="report-period-help">
          O relatório de disparos considera as tentativas de mensagem registradas entre as duas
          datas, incluindo o dia final inteiro.
        </p>
      </section>
      {message ? (
        <p
          className={
            messageIsError ? 'error' : message.startsWith('Arquivo gerado') ? 'success' : 'notice'
          }
        >
          {message}
        </p>
      ) : null}
      <section className="grid">
        <Report
          title="Relatório de disparos"
          text="Pacientes convocados, campanha, etapa, situação das mensagens e resposta final."
          period={periodLabel(dateFrom, dateTo)}
          onClick={() => void download('dispatches.csv', 'disparos.csv')}
        />
        <Report
          title="Cancelamentos"
          text="Pacientes que cancelaram, etapa de origem e data da resposta."
          period={periodLabel(dateFrom, dateTo)}
          disabled
        />
        <Report
          title="Finalizados sem resposta"
          text="Histórico das tentativas e datas dos disparos concluídos sem retorno."
          period={periodLabel(dateFrom, dateTo)}
          disabled
        />
      </section>
      <p className="notice section-gap">
        <Icon name="report" />
        <span>
          Os relatórios desta área contêm apenas informações operacionais. Dados de custos não são
          exibidos no painel.
        </span>
      </p>
    </AppShell>
  );
}

function Report({
  title,
  text,
  onClick,
  disabled,
  period,
}: {
  title: string;
  text: string;
  onClick?: () => void;
  disabled?: boolean;
  period: string;
}) {
  return (
    <article className="card">
      <span className="stat-icon">
        <Icon name="report" />
      </span>
      <h2 style={{ marginTop: 18, marginBottom: 8 }}>{title}</h2>
      <p className="muted" style={{ minHeight: 64 }}>
        {text}
      </p>
      <span className="report-card-period">
        <Icon name="clock" />
        {period}
      </span>
      <button className="button secondary" disabled={disabled} onClick={onClick}>
        <Icon name="download" />
        {disabled ? 'Em breve' : 'Baixar em CSV'}
      </button>
    </article>
  );
}

function today() {
  return toInputDate(new Date());
}

function firstDayOfCurrentMonth() {
  const value = new Date();
  value.setDate(1);
  return toInputDate(value);
}

function daysAgo(days: number) {
  const value = new Date();
  value.setDate(value.getDate() - days);
  return toInputDate(value);
}

function toInputDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function periodLabel(dateFrom: string, dateTo: string) {
  if (!dateFrom || !dateTo) return 'Período não definido';
  return `${formatInputDate(dateFrom)} a ${formatInputDate(dateTo)}`;
}

function formatInputDate(value: string) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function datedFileName(name: string, dateFrom: string, dateTo: string) {
  const extensionIndex = name.lastIndexOf('.');
  const base = extensionIndex >= 0 ? name.slice(0, extensionIndex) : name;
  const extension = extensionIndex >= 0 ? name.slice(extensionIndex) : '';
  return `${base}_${dateFrom}_a_${dateTo}${extension}`;
}
