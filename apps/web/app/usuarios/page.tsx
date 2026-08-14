'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AppShell } from '../components/navigation';
import { EmptyState, Feedback, Icon, LoadingState } from '../components/ui';
import { authFetch } from '../lib/api';
import { formatDateTime } from '../lib/date-time';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

type Operator = {
  id: string;
  name: string;
  email: string;
  role: 'OPERATOR';
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type Notice = { tone: 'success' | 'error' | 'notice'; text: string } | null;

export default function UsersPage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [editing, setEditing] = useState<Operator | 'new' | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Operator | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch(`${API}/users`);
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.message ?? 'Não foi possível carregar os usuários.');
      }
      setOperators(body);
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Não foi possível carregar os usuários.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const data = new FormData(event.currentTarget);
    const isNew = editing === 'new';
    const password = String(data.get('password') ?? '');
    const payload = isNew
      ? {
          name: data.get('name'),
          email: data.get('email'),
          password,
        }
      : {
          name: data.get('name'),
          active: data.get('active') === 'on',
          ...(password ? { password } : {}),
        };
    setSaving(true);
    setNotice(null);
    try {
      const response = await authFetch(isNew ? `${API}/users` : `${API}/users/${editing.id}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message ?? 'Não foi possível salvar o operador.');
      setEditing(null);
      setNotice({
        tone: 'success',
        text: isNew ? 'Operador criado com sucesso.' : 'Operador atualizado com sucesso.',
      });
      await load();
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Não foi possível salvar o operador.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!pendingDelete) return;
    setSaving(true);
    setNotice(null);
    try {
      const response = await authFetch(`${API}/users/${pendingDelete.id}`, { method: 'DELETE' });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.message ?? 'Não foi possível excluir o operador.');
      }
      const name = pendingDelete.name;
      setPendingDelete(null);
      setNotice({ tone: 'success', text: `O acesso de ${name} foi excluído.` });
      await load();
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Não foi possível excluir o operador.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="Usuários"
      eyebrow="Administração"
      actions={
        <button className="button" onClick={() => setEditing('new')}>
          <Icon name="plus" /> Novo operador
        </button>
      }
    >
      <p className="content-lead">
        Gerencie acessos operacionais. O administrador principal permanece controlado pelas
        variáveis de ambiente do EasyPanel.
      </p>
      {notice ? <Feedback tone={notice.tone}>{notice.text}</Feedback> : null}
      <section className="panel">
        <header className="panel-header">
          <div>
            <h2>Operadores</h2>
            <span className="muted">
              {operators.length.toLocaleString('pt-BR')} usuário(s) cadastrado(s)
            </span>
          </div>
        </header>
        {loading ? (
          <LoadingState label="Carregando usuários…" />
        ) : operators.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Situação</th>
                  <th>Criado em</th>
                  <th>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {operators.map((operator) => (
                  <tr key={operator.id}>
                    <td>
                      <strong>{operator.name}</strong>
                    </td>
                    <td>{operator.email}</td>
                    <td>Operador</td>
                    <td>
                      <span
                        className={`status ${operator.active ? 'status-success' : 'status-danger'}`}
                      >
                        {operator.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>{formatDateTime(operator.createdAt)}</td>
                    <td>
                      <div className="actions">
                        <button
                          className="button secondary small"
                          onClick={() => setEditing(operator)}
                        >
                          Editar
                        </button>
                        <button
                          className="button danger ghost small"
                          onClick={() => setPendingDelete(operator)}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon="users"
            title="Nenhum operador cadastrado"
            description="Crie o primeiro acesso operacional para sua equipe."
          />
        )}
      </section>
      {editing ? (
        <UserModal
          operator={editing === 'new' ? null : editing}
          saving={saving}
          onClose={() => setEditing(null)}
          onSubmit={save}
        />
      ) : null}
      {pendingDelete ? (
        <DeleteUserModal
          operator={pendingDelete}
          saving={saving}
          onClose={() => setPendingDelete(null)}
          onConfirm={() => void remove()}
        />
      ) : null}
    </AppShell>
  );
}

function DeleteUserModal({
  operator,
  saving,
  onClose,
  onConfirm,
}: {
  operator: Operator;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <article
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-user-title"
      >
        <header className="modal-header">
          <h2 id="delete-user-title">Excluir operador?</h2>
        </header>
        <div className="modal-body">
          <p>
            O acesso de <strong>{operator.name}</strong> será encerrado imediatamente e deixará de
            aparecer na lista de operadores.
          </p>
          <p className="muted">As atividades anteriores continuarão preservadas na auditoria.</p>
        </div>
        <footer className="modal-actions">
          <button className="button secondary" onClick={onClose} disabled={saving}>
            Manter operador
          </button>
          <button className="button danger" onClick={onConfirm} disabled={saving}>
            {saving ? 'Excluindo…' : 'Excluir operador'}
          </button>
        </footer>
      </article>
    </div>
  );
}

function UserModal({
  operator,
  saving,
  onClose,
  onSubmit,
}: {
  operator: Operator | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form className="modal" role="dialog" aria-modal="true" onSubmit={onSubmit}>
        <header className="panel-header">
          <div>
            <h2>{operator ? 'Editar operador' : 'Novo operador'}</h2>
            <span className="muted">Este acesso não terá permissões administrativas.</span>
          </div>
          <button type="button" className="icon-button" aria-label="Fechar" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        <div className="panel-body">
          <label className="field">
            <span>Nome completo</span>
            <input name="name" defaultValue={operator?.name ?? ''} minLength={3} required />
          </label>
          <label className="field">
            <span>E-mail</span>
            <input
              name="email"
              type="email"
              defaultValue={operator?.email ?? ''}
              disabled={Boolean(operator)}
              required
            />
          </label>
          <label className="field">
            <span>{operator ? 'Nova senha (opcional)' : 'Senha provisória'}</span>
            <input
              name="password"
              type="password"
              minLength={12}
              required={!operator}
              autoComplete="new-password"
            />
            <small className="field-hint">Use pelo menos 12 caracteres.</small>
          </label>
          {operator ? (
            <label className="checkbox-control user-active-control">
              <input name="active" type="checkbox" defaultChecked={operator.active} />
              Usuário ativo
            </label>
          ) : null}
        </div>
        <footer className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="button" disabled={saving}>
            {saving ? 'Salvando…' : operator ? 'Salvar alterações' : 'Criar operador'}
          </button>
        </footer>
      </form>
    </div>
  );
}
