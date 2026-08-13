import Link from 'next/link';

export default function Home() {
  return (
    <main className="shell">
      <header className="topbar"><span className="brand">Confirma SUS</span><Link href="/login">Entrar</Link></header>
      <section className="container">
        <p className="eyebrow">Operação de convocações</p>
        <h1>Do relatório SISREG à confirmação do paciente.</h1>
        <p className="muted">Importe, revise e acompanhe cada tentativa de contato em um único fluxo auditável.</p>
        <div className="grid" style={{ marginTop: 32 }}>
          <article className="card stat"><strong>1</strong><span className="muted">convocação por paciente</span></article>
          <article className="card stat"><strong>3</strong><span className="muted">tentativas automatizadas</span></article>
          <article className="card stat"><strong>100%</strong><span className="muted">dos eventos rastreáveis</span></article>
        </div>
      </section>
    </main>
  );
}

