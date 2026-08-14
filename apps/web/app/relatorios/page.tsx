'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../components/navigation';
import { Feedback, Icon } from '../components/ui';
import { authFetch } from '../lib/api';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
type CampaignOption = { id: string; name: string; status: string };
type ReportBase = 'dispatches' | 'cancellations' | 'no-response';
type ReportFormat = 'csv' | 'xlsx' | 'pdf';
type Downloading = ReportBase | null;

export default function ReportsPage() {
  const [notice, setNotice] = useState<{
    tone: 'success' | 'error' | 'notice';
    text: string;
  } | null>(null);
  const [dateFrom, setDateFrom] = useState(firstDayOfCurrentMonth);
  const [dateTo, setDateTo] = useState(today);
  const [campaignId, setCampaignId] = useState('');
  const [stage, setStage] = useState('');
  const [status, setStatus] = useState('');
  const [procedure, setProcedure] = useState('');
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [downloading, setDownloading] = useState<Downloading>(null);
  const [format, setFormat] = useState<ReportFormat>('xlsx');

  useEffect(() => {
    authFetch(`${API}/campaigns/options`)
      .then((response) => (response.ok ? response.json() : []))
      .then(setCampaigns)
      .catch(() => setCampaigns([]));
  }, []);

  async function download(base: ReportBase, name: string) {
    if (!dateFrom || !dateTo || dateFrom > dateTo) {
      setNotice({
        tone: 'error',
        text: 'Informe um período válido, com a data inicial anterior ou igual à data final.',
      });
      return;
    }
    setDownloading(base);
    setNotice({ tone: 'notice', text: 'Gerando o arquivo com os filtros selecionados…' });
    const query = new URLSearchParams({ dateFrom, dateTo });
    if (campaignId) query.set('campaignId', campaignId);
    if (stage && base === 'dispatches') query.set('stage', stage);
    if (status && base === 'dispatches') query.set('status', status);
    if (procedure && base === 'dispatches') query.set('procedure', procedure.trim());
    try {
      const response = await authFetch(`${API}/reports/${base}.${format}?${query}`);
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          Array.isArray(body?.message)
            ? body.message.join(', ')
            : (body?.message ?? 'Não foi possível gerar o relatório.'),
        );
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = datedFileName(`${name}.${format}`, dateFrom, dateTo);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice({ tone: 'success', text: 'Relatório gerado. O download foi iniciado.' });
    } catch (cause) {
      setNotice({
        tone: 'error',
        text: cause instanceof Error ? cause.message : 'Não foi possível gerar o relatório.',
      });
    } finally {
      setDownloading(null);
    }
  }

  return (
    <AppShell title="Relatórios" eyebrow="Análise operacional">
      <p className="content-lead">
        Exporte os dados da operação com filtros precisos. Informações financeiras permanecem
        disponíveis exclusivamente pela API.
      </p>
      <section className="panel report-filter-panel">
        <header className="panel-header">
          <div>
            <h2>Filtros do relatório</h2>
            <span className="muted">
              O período considera o dia final completo no fuso de São Paulo
            </span>
          </div>
          <span className="badge">América/São Paulo</span>
        </header>
        <div className="panel-body report-filters">
          <div className="field">
            <label htmlFor="report-date-from">Data inicial</label>
            <input
              id="report-date-from"
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="report-date-to">Data final</label>
            <input
              id="report-date-to"
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              max={today()}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="report-campaign">Campanha</label>
            <select
              id="report-campaign"
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
          <div className="field">
            <label htmlFor="report-stage">Etapa</label>
            <select
              id="report-stage"
              value={stage}
              onChange={(event) => setStage(event.target.value)}
            >
              <option value="">Todas as etapas</option>
              <option value="FIRST">1ª convocação</option>
              <option value="SECOND">2ª convocação</option>
              <option value="THIRD">3ª convocação</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="report-status">Situação da mensagem</label>
            <select
              id="report-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">Todas as situações</option>
              <option value="SUBMITTED">Aceita pelo provedor</option>
              <option value="SENT">Enviada</option>
              <option value="DELIVERED">Entregue</option>
              <option value="READ">Lida</option>
              <option value="FAILED">Falha</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="report-procedure">Procedimento</label>
            <input
              id="report-procedure"
              value={procedure}
              onChange={(event) => setProcedure(event.target.value)}
              placeholder="Ex.: PET-CT"
            />
          </div>
          <div className="field">
            <label htmlFor="report-format">Formato do arquivo</label>
            <select
              id="report-format"
              value={format}
              onChange={(event) => setFormat(event.target.value as ReportFormat)}
            >
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
            </select>
          </div>
          <div className="report-shortcuts">
            <button
              className="button secondary small"
              onClick={() => {
                setDateFrom(firstDayOfCurrentMonth());
                setDateTo(today());
              }}
            >
              Este mês
            </button>
            <button
              className="button secondary small"
              onClick={() => {
                setDateFrom(daysAgo(29));
                setDateTo(today());
              }}
            >
              Últimos 30 dias
            </button>
            <button
              className="button secondary ghost small"
              onClick={() => {
                setCampaignId('');
                setStage('');
                setStatus('');
                setProcedure('');
              }}
            >
              Limpar filtros
            </button>
          </div>
        </div>
      </section>
      {notice ? <Feedback tone={notice.tone}>{notice.text}</Feedback> : null}
      <section className="grid report-grid">
        <Report
          title="Disparos"
          text="Uma linha por mensagem, com campanha, paciente, etapa, eventos, falhas e resposta final."
          period={periodLabel(dateFrom, dateTo)}
          format={format}
          loading={downloading === 'dispatches'}
          onClick={() => void download('dispatches', 'disparos')}
        />
        <Report
          title="Cancelamentos"
          text="Pacientes cancelados, telefone utilizado, data e etapa em que a resposta foi recebida."
          period={periodLabel(dateFrom, dateTo)}
          format={format}
          loading={downloading === 'cancellations'}
          onClick={() => void download('cancellations', 'cancelamentos')}
        />
        <Report
          title="Finalizados sem resposta"
          text="Pacientes que concluíram as três tentativas sem retorno, com as datas de cada envio."
          period={periodLabel(dateFrom, dateTo)}
          format={format}
          loading={downloading === 'no-response'}
          onClick={() => void download('no-response', 'sem-resposta')}
        />
      </section>
      <Feedback tone="notice">
        Os arquivos contêm dados pessoais e devem ser armazenados e compartilhados com os mesmos
        controles de acesso do sistema.
      </Feedback>
    </AppShell>
  );
}

function Report({
  title,
  text,
  onClick,
  loading,
  period,
  format,
}: {
  title: string;
  text: string;
  onClick: () => void;
  loading: boolean;
  period: string;
  format: ReportFormat;
}) {
  return (
    <article className="card report-card">
      <span className="stat-icon">
        <Icon name="report" />
      </span>
      <h2>{title}</h2>
      <p className="muted">{text}</p>
      <span className="report-card-period">
        <Icon name="clock" />
        {period}
      </span>
      <button className="button secondary full-width" disabled={loading} onClick={onClick}>
        <Icon name="download" />
        {loading ? 'Gerando…' : `Baixar em ${format === 'xlsx' ? 'Excel' : format.toUpperCase()}`}
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
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}
function periodLabel(from: string, to: string) {
  const format = (value: string) => value.split('-').reverse().join('/');
  return from && to ? `${format(from)} a ${format(to)}` : 'Período não definido';
}
function datedFileName(name: string, from: string, to: string) {
  const index = name.lastIndexOf('.');
  return `${name.slice(0, index)}_${from}_a_${to}${name.slice(index)}`;
}
