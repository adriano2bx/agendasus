import type { ReactNode, SVGProps } from 'react';
import { statusLabel } from '../lib/labels';

export function Brand({ negative = false }: { negative?: boolean }) {
  return (
    <span className="brand-lockup">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <path
          d="M73 21a36 36 0 1 0 0 58"
          fill="none"
          stroke={negative ? '#fff' : '#0D2B5A'}
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M32 51l15 14 30-32"
          fill="none"
          stroke="#0BA99D"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>
        <b>CONFIRMA</b> <em>SUS</em>
      </span>
    </span>
  );
}

export function Icon({ name, ...props }: { name: string } & SVGProps<SVGSVGElement>) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  const paths: Record<string, React.ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" />
        <path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
      </>
    ),
    send: (
      <>
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    report: (
      <>
        <path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
        <path d="M8 17v-5m4 5V7m4 10v-8" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5M15 12H3" />
        <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    filter: (
      <>
        <path d="M4 5h16M7 12h10M10 19h4" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    alert: (
      <>
        <path d="M12 3 2.8 19a1 1 0 0 0 .9 1.5h16.6a1 1 0 0 0 .9-1.5Z" />
        <path d="M12 9v4m0 3h.01" />
      </>
    ),
    file: (
      <>
        <path d="M6 2h8l4 4v16H6Z" />
        <path d="M14 2v5h5" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12m0 0 5-5m-5 5-5-5" />
        <path d="M4 20h16" />
      </>
    ),
    message: (
      <>
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.7-5A8 8 0 1 1 21 15Z" />
      </>
    ),
    menu: (
      <>
        <path d="M4 6h16M4 12h16M4 18h16" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
    refresh: (
      <>
        <path d="M20 7v5h-5" />
        <path d="M4 17v-5h5" />
        <path d="M6.1 9a7 7 0 0 1 11.6-2L20 9M4 15l2.3 2a7 7 0 0 0 11.6-2" />
      </>
    ),
  };
  return (
    <svg {...common} {...props}>
      {paths[name] ?? paths.file}
    </svg>
  );
}

export function StatusBadge({ value }: { value: string }) {
  const terminal = ['CONFIRMED', 'DELIVERED', 'READ', 'VALID', 'COMPLETED'];
  const danger = ['FAILED', 'SEND_ERROR', 'INVALID'];
  const warning = ['PAUSED', 'WARNING', 'WAITING_RESPONSE', 'REVIEW_REQUIRED'];
  const tone =
    value === 'CANCELLED'
      ? 'cancelled'
      : terminal.includes(value)
        ? 'success'
        : danger.includes(value)
          ? 'danger'
          : warning.includes(value)
            ? 'warning'
            : 'info';
  return (
    <span className={`status status-${tone}`}>
      <i />
      {statusLabel(value)}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  icon = 'file',
  action,
}: {
  title: string;
  description: string;
  icon?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name={icon} />
      </span>
      <strong>{title}</strong>
      <p>{description}</p>
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ label = 'Carregando dados…' }: { label?: string }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function Pagination({
  page,
  pages,
  total,
  limit,
  onPage,
}: {
  page: number;
  pages: number;
  total: number;
  limit: number;
  onPage: (page: number) => void;
}) {
  if (total === 0) return null;
  const first = (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);
  return (
    <nav className="pagination" aria-label="Paginação">
      <span>
        {first.toLocaleString('pt-BR')}–{last.toLocaleString('pt-BR')} de{' '}
        {total.toLocaleString('pt-BR')}
      </span>
      <div>
        <button
          className="button secondary small"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Anterior
        </button>
        <strong>
          Página {page} de {pages}
        </strong>
        <button
          className="button secondary small"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Próxima
        </button>
      </div>
    </nav>
  );
}

export function Feedback({
  tone,
  children,
}: {
  tone: 'success' | 'error' | 'notice';
  children: ReactNode;
}) {
  return (
    <div className={tone} role={tone === 'error' ? 'alert' : 'status'} aria-live="polite">
      <Icon name={tone === 'success' ? 'check' : tone === 'error' ? 'alert' : 'file'} />
      <span>{children}</span>
    </div>
  );
}
