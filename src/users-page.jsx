// MYT — Users page (admin) and User Edit modal

import React from 'react';
import { Avatar, Icon } from './atoms.jsx';
import { load, todayISO } from './data.js';
import { supabase } from './supabase.js';

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

async function reloadState(setState) {
  try {
    const next = await load();
    setState(next);
  } catch (e) {
    console.error("reload after user change failed:", e);
  }
}

function UserEditModal({ user, state, setState, onClose, onNotify, onRequestConfirm }) {
  const isNew = !user;
  const [form, setForm] = React.useState(user ? { ...user, password: "" } : {
    name: "", email: "", password: "",
    role: "user", title: ""
  });
  const [busy, setBusy] = React.useState(false);
  const [deletePromptOpen, setDeletePromptOpen] = React.useState(false);
  const [deleteSecret, setDeleteSecret] = React.useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (busy) return;
    if (!form.name.trim() || !form.email.trim()) return;
    if (isNew && !form.password.trim()) return;

    setBusy(true);
    try {
      if (isNew) {
        const { data, error } = await supabase.functions.invoke("create-user", {
          body: {
            action: "create",
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            password: form.password,
            role: form.role,
            title: form.title || ""
          }
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        await reloadState(setState);
      } else {
        if (form.password.trim()) {
          const { data, error } = await supabase.functions.invoke("create-user", {
            body: {
              action: "update_password",
              auth_user_id: user.auth_user_id,
              password: form.password
            }
          });
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
        }
        const { error: updErr } = await supabase
          .from("users")
          .update({
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            role: form.role,
            title: form.title || ""
          })
          .eq("id", form.id);
        if (updErr) throw updErr;
        await reloadState(setState);
      }
      onClose();
    } catch (e) {
      onNotify?.(e?.message || "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const requestRemove = () => {
    if (user.role === "admin") {
      onNotify?.("Cannot delete the admin account.");
      return;
    }
    setDeleteSecret("");
    setDeletePromptOpen(true);
  };

  const remove = () => {
    if (busy) return;
    if (!deleteSecret.trim()) {
      onNotify?.("Enter the secret code to delete this team member.");
      return;
    }
    onRequestConfirm?.({
      title: "Delete team member",
      message: `Delete ${user.name}? Their tasks will remain but unassigned.`,
      confirmLabel: "Delete member",
      kind: "danger",
      onConfirm: async () => {
        try {
          setBusy(true);
          const { data, error } = await supabase.functions.invoke("create-user", {
            body: {
              action: "delete",
              auth_user_id: user.auth_user_id,
              profile_id: user.id,
              delete_secret: deleteSecret
            }
          });
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          await reloadState(setState);
          onClose();
        } catch (e) {
          onNotify?.(e?.message || "Delete failed.");
        } finally {
          setBusy(false);
        }
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
            <input className="field-input" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="harish@myt.com" />
          </div>
          <div className="row-2">
            <div className="field">
              <div className="field-label">{isNew ? "Password" : "New password (leave blank to keep)"}</div>
              <input className="field-input" value={form.password} onChange={e => set("password", e.target.value)} placeholder={isNew ? "Initial password" : ""} />
            </div>
            <div className="field">
              <div className="field-label">Role</div>
              <select className="field-input" value={form.role} onChange={e => set("role", e.target.value)}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          {!isNew && deletePromptOpen && (
            <div className="delete-code-box">
              <div className="field-label">Secret code required</div>
              <input
                className="field-input"
                type="password"
                value={deleteSecret}
                onChange={e => setDeleteSecret(e.target.value)}
                placeholder="Enter secret code"
                autoFocus
              />
              <div className="field-help">This code is verified by Supabase before the member is deleted.</div>
            </div>
          )}
        </div>
        <div className="modal-foot">
          {!isNew && user.role !== "admin" && (
            deletePromptOpen ? (
              <>
                <button className="btn btn-ghost" onClick={() => { setDeletePromptOpen(false); setDeleteSecret(""); }} disabled={busy}>Cancel delete</button>
                <button className="btn btn-danger" onClick={remove} disabled={busy || !deleteSecret.trim()}>Confirm delete</button>
              </>
            ) : (
              <button className="btn btn-ghost" style={{ color: "var(--danger)" }} onClick={requestRemove} disabled={busy}>Delete user</button>
            )
          )}
          <div style={{ flex: 1 }}></div>
          <button
            className="btn btn-primary"
            onClick={save}
            disabled={busy || !form.name.trim() || !form.email.trim() || (isNew && !form.password.trim())}
          >
            {busy ? "Working…" : isNew ? "Create user" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
