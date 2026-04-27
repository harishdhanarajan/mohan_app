// MYT — Users page (admin) and User Edit modal

import React from 'react';
import { Avatar, Icon } from './atoms.jsx';
import { todayISO } from './data.js';

export function UsersPage({ state, setState, onOpenTask, onNotify, onRequestConfirm }) {
  const [editing, setEditing] = React.useState(null);
  const [creating, setCreating] = React.useState(false);

  const userStats = (uid) => {
    const all = state.tasks.filter(t => t.assigneeId === uid);
    return {
      open: all.filter(t => t.status !== "done").length,
      done: all.filter(t => t.status === "done").length,
      overdue: all.filter(t => t.status !== "done" && t.dueDate < todayISO()).length
    };
  };

  return (
    <>
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <h1 className="page-title">Team members</h1>
          <div className="page-sub">{state.users.length} users · manage access and assignments</div>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          <Icon name="plus" size={14} /> New user
        </button>
      </div>

      <div className="user-grid">
        {state.users.map(u => {
          const s = userStats(u.id);
          return (
            <div className="user-card" key={u.id}>
              <div className="user-card-head">
                <Avatar user={u} size="lg" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="user-card-name">{u.name}</div>
                  <div className="user-card-email">{u.email}</div>
                  <div style={{ marginTop: 4 }}>
                    <span className="badge badge-status" style={{ fontSize: 10.5 }}>
                      {u.role === "admin" ? "Admin" : u.title || "User"}
                    </span>
                  </div>
                </div>
                <button className="icon-btn" onClick={() => setEditing(u)}><Icon name="edit" size={14} /></button>
              </div>
              <div className="user-card-stats">
                <div className="user-card-stat"><div className="v">{s.open}</div><div className="l">Open</div></div>
                <div className="user-card-stat"><div className="v" style={{ color: s.overdue > 0 ? "var(--danger)" : "inherit" }}>{s.overdue}</div><div className="l">Overdue</div></div>
                <div className="user-card-stat"><div className="v">{s.done}</div><div className="l">Done</div></div>
              </div>
            </div>
          );
        })}
      </div>

      {(editing || creating) && (
        <UserEditModal
          state={state} setState={setState}
          user={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onNotify={onNotify}
          onRequestConfirm={onRequestConfirm}
        />
      )}
    </>
  );
}

function UserEditModal({ user, state, setState, onClose, onNotify, onRequestConfirm }) {
  const isNew = !user;
  const [form, setForm] = React.useState(user ? { ...user } : {
    id: "u-" + Date.now(),
    name: "", email: "", password: "",
    role: "user", title: ""
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) return;
    const next = { ...state };
    if (isNew) next.users = [...state.users, form];
    else next.users = state.users.map(u => u.id === form.id ? form : u);
    setState(next);
    onClose();
  };

  const remove = () => {
    if (user.role === "admin") {
      onNotify?.("Cannot delete the admin account.");
      return;
    }
    onRequestConfirm?.({
      title: "Delete team member",
      message: `Delete ${user.name}? Their tasks will remain but unassigned.`,
      confirmLabel: "Delete member",
      kind: "danger",
      onConfirm: () => {
        setState({ ...state, users: state.users.filter(u => u.id !== user.id) });
        onClose();
      }
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-head">
          <div style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>{isNew ? "New user" : "Edit user"}</div>
          <button className="icon-btn" onClick={onClose} title="Close"><Icon name="close" /></button>
        </div>
        <div className="modal-body">
          <div className="row-2">
            <div className="field">
              <div className="field-label">Full name</div>
              <input className="field-input" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Full name" autoFocus />
            </div>
            <div className="field">
              <div className="field-label">Title</div>
              <input className="field-input" value={form.title} onChange={e => set("title", e.target.value)} placeholder="Role or title" />
            </div>
          </div>
          <div className="field">
            <div className="field-label">Email</div>
            <input className="field-input" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="Email address" />
          </div>
          <div className="row-2">
            <div className="field">
              <div className="field-label">Password</div>
              <input className="field-input" value={form.password} onChange={e => set("password", e.target.value)} />
            </div>
            <div className="field">
              <div className="field-label">Role</div>
              <select className="field-input" value={form.role} onChange={e => set("role", e.target.value)}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          {!isNew && user.role !== "admin" && (
            <button className="btn btn-ghost" style={{ color: "var(--danger)" }} onClick={remove}>Delete user</button>
          )}
          <div style={{ flex: 1 }}></div>
          <button className="btn btn-primary" onClick={save} disabled={!form.name.trim() || !form.email.trim() || !form.password.trim()}>
            {isNew ? "Create user" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
