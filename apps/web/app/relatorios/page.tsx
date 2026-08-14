'use client';

import { useState } from 'react';
import { AppShell } from '../components/navigation';
import { Icon } from '../components/ui';
import { authFetch } from '../lib/api';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export default function ReportsPage() {
  const [message, setMessage] = useState('');

  async function download(path: string, name: string) {
    setMessage('Gerando arquivo…');
    const response = await authFetch(`${API}/reports/${path}`);
    if (!response.ok) {
      setMessage('Não foi possível gerar o relatório.');
      return;
    }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
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
      {message ? (
        <p className={message.startsWith('Arquivo gerado') ? 'success' : 'notice'}>{message}</p>
      ) : null}
      <section className="grid">
        <Report
          title="Relatório de disparos"
          text="Pacientes convocados, campanha, etapa, situação das mensagens e resposta final."
          onClick={() => void download('dispatches.csv', 'disparos.csv')}
        />
        <Report
          title="Cancelamentos"
          text="Pacientes que cancelaram, etapa de origem e data da resposta."
          disabled
        />
        <Report
          title="Finalizados sem resposta"
          text="Histórico das tentativas e datas dos disparos concluídos sem retorno."
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
}: {
  title: string;
  text: string;
  onClick?: () => void;
  disabled?: boolean;
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
      <button className="button secondary" disabled={disabled} onClick={onClick}>
        <Icon name="download" />
        {disabled ? 'Em breve' : 'Baixar em CSV'}
      </button>
    </article>
  );
}
