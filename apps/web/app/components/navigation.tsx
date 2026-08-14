'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Brand, Icon } from './ui';

const groups = [
  {
    label: 'Operação',
    links: [
      { label: 'Visão geral', href: '/painel', icon: 'grid' },
      { label: 'Importações', href: '/importacoes', icon: 'upload' },
      { label: 'Campanhas', href: '/campanhas', icon: 'send' },
      { label: 'Convocações', href: '/convocacoes', icon: 'users' },
    ],
  },
  { label: 'Análise', links: [{ label: 'Relatórios', href: '/relatorios', icon: 'report' }] },
  { label: 'Administração', links: [{ label: 'Usuários', href: '/usuarios', icon: 'user' }] },
] as const;

export function AppShell({ children, title, eyebrow, actions }: { children: ReactNode; title: string; eyebrow?: string; actions?: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const crumbs = pathname.split('/').filter(Boolean);

  function logout() {
    sessionStorage.removeItem('confirma_access_token');
    router.replace('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/painel" className="sidebar-brand" aria-label="Confirma SUS — início"><Brand negative /></Link>
        <nav className="side-nav" aria-label="Navegação principal">
          {groups.map((group) => (
            <section className="nav-group" key={group.label}>
              <span className="nav-label">{group.label}</span>
              {group.links.map((link) => {
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                return <Link key={link.href} href={link.href} className={`nav-item${active ? ' active' : ''}`}><Icon name={link.icon} /><span>{link.label}</span></Link>;
              })}
            </section>
          ))}
        </nav>
        <div className="user-panel">
          <span className="user-avatar">AD</span>
          <span className="user-copy"><strong>Administrador</strong><small>Acesso administrativo</small></span>
          <button className="icon-button inverse" aria-label="Sair" title="Sair" onClick={logout}><Icon name="logout" /></button>
        </div>
      </aside>
      <div className="workspace">
        <header className="workspace-header">
          <div>
            <div className="breadcrumb"><Link href="/painel">Confirma SUS</Link>{crumbs.map((crumb) => <span key={crumb}>/ {humanize(crumb)}</span>)}</div>
            {eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}
            <h1 className="page-title">{title}</h1>
          </div>
          {actions ? <div className="page-actions">{actions}</div> : null}
        </header>
        <main className="workspace-content">{children}</main>
      </div>
    </div>
  );
}

export function Navigation() { return null; }

function humanize(value: string) {
  return value.replace(/-/g, ' ').replace(/^./, (letter) => letter.toUpperCase()).replace(/^[0-9a-f-]{20,}$/i, 'Detalhe');
}
