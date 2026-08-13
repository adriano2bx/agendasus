'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Navigation } from '../components/navigation';
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
type User = { id: string; name: string; email: string; role: string; active: boolean; createdAt: string };
export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]); const [message, setMessage] = useState('');
  const load = async () => { const response = await fetch(`${API}/users`, { headers: auth() }); if (response.ok) setUsers(await response.json()); else setMessage('Apenas administradores podem consultar usuários.'); };
  useEffect(() => { void load(); }, []);
  async function create(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const data = Object.fromEntries(new FormData(form)); const response = await fetch(`${API}/users`, { method: 'POST', headers: { ...auth(), 'content-type': 'application/json' }, body: JSON.stringify(data) }); setMessage(response.ok ? 'Usuário criado.' : 'Não foi possível criar o usuário.'); if (response.ok) { form.reset(); await load(); } }
  return <main className="shell"><Navigation current="/usuarios" /><section className="container"><p className="eyebrow">Administração</p><h1>Usuários</h1>{message ? <p className={message === 'Usuário criado.' ? 'success' : 'error'}>{message}</p> : null}<div className="grid two"><form className="card" onSubmit={create}><h2>Novo usuário</h2><div className="field"><label htmlFor="name">Nome</label><input id="name" name="name" required /></div><div className="field"><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" required /></div><div className="field"><label htmlFor="password">Senha</label><input id="password" name="password" type="password" minLength={12} required /></div><div className="field"><label htmlFor="role">Perfil</label><select id="role" name="role" defaultValue="OPERATOR"><option value="OPERATOR">Operador</option><option value="ADMIN">Administrador</option></select></div><button className="button">Criar usuário</button></form><section className="card"><h2>Acessos ativos</h2>{users.map(user => <p key={user.id} className="row"><strong>{user.name}</strong><span className="muted">{user.email} · {user.role} · {user.active ? 'ativo' : 'inativo'}</span></p>)}{users.length === 0 ? <p className="muted">Nenhum usuário carregado.</p> : null}</section></div></section></main>;
}
function auth() { return { authorization: `Bearer ${sessionStorage.getItem('confirma_access_token') ?? ''}` }; }
