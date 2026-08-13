import Link from 'next/link';

const links = [
  ['Painel', '/painel'],
  ['Importações', '/importacoes'],
  ['Campanhas', '/campanhas'],
  ['Convocações', '/convocacoes'],
  ['Financeiro', '/financeiro'],
  ['Relatórios', '/relatorios'],
  ['Usuários', '/usuarios'],
] as const;

export function Navigation({ current }: { current?: string }) {
  return (
    <header className="topbar">
      <Link href="/painel" className="brand">Confirma SUS</Link>
      <nav className="nav" aria-label="Navegação principal">
        {links.map(([label, href]) => <Link key={href} className={current === href ? 'active' : ''} href={href}>{label}</Link>)}
      </nav>
    </header>
  );
}
