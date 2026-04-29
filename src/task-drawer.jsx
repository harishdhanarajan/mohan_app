// MYT — Task drawer (detail view) + create/edit modal

import React from 'react';
import { Avatar, DueCell, Icon, PriorityBadge, StatusBadge } from './atoms.jsx';
import { dayOffset, formatRelTime, STATUS_LABELS, STATUS_ORDER, todayISO } from './data.js';

export function TaskDrawer({ taskId, state, setState, onClose, currentUser, onSetStatus, onNotify, onRequestConfirm }) {
  const task = state.tasks.find(t => t.id === taskId);
  const [tab, setTab] = React.useState("comments");
  const [comment, setComment] = React.useState("");
  const [editing, setEditing] = React.useState(false);
  if (!task) return null;

  const assignee = state.users.find(u => u.id === task.assigneeId);
  const adminUser = currentUser.role === "admin" ? currentUser : state.users.find(u => u.role === "admin");
  const project = state.projects.find(p => p.id === task.projectId);
  const isAdmin = currentUser.role === "admin";
  const isDone = task.status === "done";
  const selectableStatuses = STATUS_ORDER;

  const updateTask = (patch, activityText) => {
    const next = { ...state };
    next.tasks = state.tasks.map(t => {
      if (t.id !== taskId) return t;
      const updated = { ...t, ...patch };
      if (activityText) {
        updated.activity = [...(t.activity || []), {
          ts: new Date().toISOString().slice(0, 16),
          actor: currentUser.id,
          text: activityText
        }];
      }
      return updated;
    });
    if (activityText && !isAdmin) {
      next.notifications = [{
        id: "n-" + Date.now(),
        ts: new Date().toISOString().slice(0, 16),
        actorId: currentUser.id, taskId,
        kind: patch.status || "update",
        text: `${currentUser.name.split(" ")[0]} ${activityText} on '${task.title}'`,
        read: false
      }, ...state.notifications];
    }
    setState(next);
  };

  const addComment = () => {
    if (!comment.trim()) return;
    const c = {
      id: "c-" + Date.now(),
      authorId: currentUser.id,
      ts: new Date().toISOString().slice(0, 16),
      text: comment.trim()
    };
    const next = { ...state };
    next.tasks = state.tasks.map(t => t.id === taskId ? {
      ...t,
      comments: [...(t.comments || []), c],
      activity: [...(t.activity || []), {
        ts: c.ts, actor: currentUser.id, text: "added a comment"
      }]
    } : t);
    if (!isAdmin) {
      next.notifications = [{
        id: "n-" + Date.now(),
        ts: c.ts, actorId: currentUser.id, taskId,
        kind: "comment",
        text: `${currentUser.name.split(" ")[0]} commented on '${task.title}'`,
        read: false
      }, ...state.notifications];
    }
    setState(next);
    setComment("");
  };

  const setStatus = (s) => {
    if (onSetStatus) {
      onSetStatus(taskId, s);
      return;
    }
    if (s === "done" && !(task.comments || []).length) {
      onNotify?.("Add at least one comment before marking this task as done.");
      return;
    }
    if (s === "review" && !adminUser) {
      onNotify?.("No admin user is available to receive review tasks.");
      return;
    }
    const firstUser = state.users.find(u => u.role === "user");
    const returningFromReview = task.status === "review" && s !== "review" && assignee?.role === "admin" && firstUser;
    updateTask(
      s === "review"
        ? { status: s, assigneeId: adminUser.id }
        : { status: s, ...(returningFromReview ? { assigneeId: firstUser.id } : {}) },
      returningFromReview ? `moved status to ${STATUS_LABELS[s]} and reassigned to ${firstUser.name}` : `moved status to ${STATUS_LABELS[s]}`
    );
  };

  const reassignToAdmin = () => {
    if (!adminUser) {
      onNotify?.("No admin user is available to receive this task.");
      return;
    }
    updateTask({ assigneeId: adminUser.id }, `reassigned to ${adminUser.name}`);
  };

  const deleteTask = () => {
    onRequestConfirm?.({
      title: "Delete task",
      message: "Delete this task? This cannot be undone.",
      confirmLabel: "Delete task",
      kind: "danger",
      onConfirm: () => {
        setState({ ...state, tasks: state.tasks.filter(t => t.id !== taskId) });
        onClose();
      }
    });
  };

  if (editing) {
    return (
      <TaskEditModal
        state={state} setState={setState}
        task={task}
        onClose={() => setEditing(false)}
        currentUser={currentUser}
        onNotify={onNotify}
      />
    );
  }

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose}></div>
      <div className="drawer">
        <div className="drawer-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
              {project?.name || "—"} · {task.id.toUpperCase()}
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2, letterSpacing: "-0.01em" }}>
              {task.title}
            </div>
          </div>
          {isAdmin && (
            <>
              <button className="icon-btn" onClick={() => setEditing(true)} title="Edit task"><Icon name="edit" /></button>
              <button className="icon-btn" onClick={deleteTask} title="Delete task" style={{ color: "var(--danger)" }}><Icon name="trash" /></button>
            </>
          )}
          <button className="icon-btn" onClick={onClose}><Icon name="close" /></button>
        </div>

        <div className="drawer-body">
          <div className="kv-grid">
            <div className="k">Status</div>
            <div className="v">
              {!isDone && (isAdmin || currentUser.id === task.assigneeId) ? (
                <select className="field-input" style={{ width: "auto", padding: "5px 8px", fontSize: 13 }}
                  value={task.status} onChange={e => setStatus(e.target.value)}>
                  {selectableStatuses.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              ) : <StatusBadge status={task.status} />}
            </div>

            <div className="k">Priority</div>
            <div className="v"><PriorityBadge priority={task.priority} /></div>

            <div className="k">Assignee</div>
            <div className="v" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar user={assignee} size="sm" /> {assignee?.name}
            </div>

            <div className="k">Start</div>
            <div className="v">{task.startDate ? new Date(task.startDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</div>

            <div className="k">Due</div>
            <div className="v"><DueCell task={task} /></div>

            {task.tags && task.tags.length > 0 && (
              <>
                <div className="k">Tags</div>
                <div className="v" style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {task.tags.map(t => <span key={t} className="chip" style={{ fontSize: 11 }}>{t}</span>)}
                </div>
              </>
            )}
          </div>

          <div className="section-divider"></div>

          <div className="field-label">Description</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--text-secondary)" }}>
            {task.description || <span style={{ fontStyle: "italic", color: "var(--text-tertiary)" }}>No description.</span>}
          </div>

          {task.attachments && task.attachments.length > 0 && (
            <>
              <div className="section-divider"></div>
              <div className="field-label">Attachments</div>
              {task.attachments.map((a, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 10px", border: "1px solid var(--border)",
                  borderRadius: 8, marginBottom: 6, fontSize: 13
                }}>
                  <Icon name="paperclip" size={14} />
                  <div style={{ flex: 1 }}>{a.name}</div>
                  <div style={{ color: "var(--text-tertiary)", fontSize: 12 }}>{a.size}</div>
                </div>
              ))}
            </>
          )}

          <div className="section-divider"></div>

          <div className="tabs">
            <button className={`tab ${tab === "comments" ? "active" : ""}`} onClick={() => setTab("comments")}>
              Comments {task.comments?.length ? `(${task.comments.length})` : ""}
            </button>
            <button className={`tab ${tab === "activity" ? "active" : ""}`} onClick={() => setTab("activity")}>
              Activity
            </button>
          </div>

          {tab === "comments" ? (
            <>
              {(!task.comments || task.comments.length === 0) ? (
                <div className="comment-empty">No comments yet.</div>
              ) : task.comments.map(c => {
                const a = state.users.find(u => u.id === c.authorId);
                return (
                  <div className="comment" key={c.id}>
                    <Avatar user={a} size="sm" />
                    <div>
                      <div className="comment-bubble">{c.text}</div>
                      <div className="comment-meta">
                        <span className="comment-author">{a?.name}</span>
                        <span>·</span>
                        <span>{formatRelTime(c.ts)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "flex-start" }}>
                <Avatar user={currentUser} size="sm" />
                <div style={{ flex: 1 }}>
                  <textarea
                    className="field-input"
                    placeholder="Write a comment…"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    style={{ minHeight: 60 }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                    <button className="btn btn-primary btn-sm" onClick={addComment} disabled={!comment.trim()}>
                      Post comment
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <ul className="activity-list">
              {(task.activity || []).slice().reverse().map((a, i) => {
                const actor = state.users.find(u => u.id === a.actor);
                return (
                  <li className="activity-row" key={i}>
                    <span className="activity-dot"></span>
                    <div>
                      <div><strong>{actor?.name || "Someone"}</strong> {a.text}</div>
                      <div className="activity-time">{formatRelTime(a.ts)}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="drawer-foot">
          {!isDone && !isAdmin && currentUser.id === task.assigneeId && (
            <>
              <button className="btn btn-primary" onClick={() => setStatus("done")}>
                <Icon name="check" size={14} /> Mark as done
              </button>
              <button className="btn btn-ghost" onClick={reassignToAdmin}>
                Reassign to {adminUser?.name || "reviewer"}
              </button>
            </>
          )}
          {!isDone && isAdmin && (
            <button className="btn btn-secondary" onClick={() => setEditing(true)}>
              <Icon name="edit" size={14} /> Edit task
            </button>
          )}
          <div style={{ flex: 1 }}></div>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </>
  );
}

export function TaskEditModal({ task, state, setState, onClose, currentUser, onNotify }) {
  const isNew = !task;
  const selectableStatuses = STATUS_ORDER;
  const adminUser = currentUser.role === "admin" ? currentUser : state.users.find(u => u.role === "admin");
  const userAssignees = state.users.filter(u => u.role === "user");
  const [form, setForm] = React.useState(task ? { ...task } : {
    id: "t-" + Date.now(),
    title: "",
    description: "",
    assigneeId: userAssignees[0]?.id || "",
    projectId: state.projects[0]?.id || null,
    priority: "medium",
    status: "todo",
    startDate: todayISO(),
    dueDate: dayOffset(3),
    tags: [],
    attachments: [],
    comments: [],
    activity: []
  });
  const [tagInput, setTagInput] = React.useState((task?.tags || []).join(", "));

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const selectedStatus = selectableStatuses.includes(form.status) ? form.status : "todo";
  const assigneeOptions = selectedStatus === "review" && adminUser ? [adminUser] : userAssignees;

  const setStatus = (nextStatus) => {
    const normalizedStatus = selectableStatuses.includes(nextStatus) ? nextStatus : "todo";
    setForm(f => {
      if (normalizedStatus === "review") {
        return { ...f, status: normalizedStatus, assigneeId: adminUser?.id || f.assigneeId };
      }
      const selectedUserExists = userAssignees.some(u => u.id === f.assigneeId);
      return {
        ...f,
        status: normalizedStatus,
        assigneeId: selectedUserExists ? f.assigneeId : userAssignees[0]?.id || f.assigneeId
      };
    });
  };

  const save = () => {
    if (!form.title.trim()) return;
    if (form.status === "done" && !(form.comments || []).length) {
      onNotify?.("Add at least one comment before marking this task as done.");
      return;
    }
    const tags = tagInput.split(",").map(s => s.trim()).filter(Boolean);
    const normalizedStatus = selectableStatuses.includes(form.status) ? form.status : "todo";
    if (normalizedStatus === "review" && !adminUser) {
      onNotify?.("No admin user is available to receive review tasks.");
      return;
    }
    const selectedUserAssignee = userAssignees.some(u => u.id === form.assigneeId)
      ? form.assigneeId
      : userAssignees[0]?.id || form.assigneeId;
    const normalizedForm = {
      ...form,
      status: normalizedStatus,
      assigneeId: normalizedStatus === "review" ? adminUser.id : selectedUserAssignee
    };
    const next = { ...state };
    if (isNew) {
      const newTask = { ...normalizedForm, tags, activity: [{
        ts: new Date().toISOString().slice(0, 16),
        actor: currentUser.id, text: "created task"
      }]};
      next.tasks = [newTask, ...state.tasks];
    } else {
      next.tasks = state.tasks.map(t => t.id === form.id ? {
        ...normalizedForm,
        tags,
        activity: [...(t.activity || []), {
          ts: new Date().toISOString().slice(0, 16),
          actor: currentUser.id, text: "edited task details"
        }]
      } : t);
    }
    setState(next);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ width: 560 }}>
        <div className="modal-head">
          <div style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>
            {isNew ? "New task" : "Edit task"}
          </div>
          <button className="icon-btn" onClick={onClose} title="Close"><Icon name="close" /></button>
        </div>
        <div className="modal-body">
          <div className="field">
            <div className="field-label">Title</div>
            <input className="field-input" value={form.title} onChange={e => set("title", e.target.value)} placeholder="What needs to be done?" autoFocus />
          </div>
          <div className="field">
            <div className="field-label">Description</div>
            <textarea className="field-input" value={form.description} onChange={e => set("description", e.target.value)} placeholder="Add context, requirements, links…" />
          </div>
          <div className="row-2">
            <div className="field">
              <div className="field-label">Assignee</div>
              <select className="field-input" value={form.assigneeId} onChange={e => set("assigneeId", e.target.value)}>
                {assigneeOptions.map(u =>
                  <option key={u.id} value={u.id}>{u.name}</option>
                )}
              </select>
            </div>
            <div className="field">
              <div className="field-label">Project</div>
              <select className="field-input" value={form.projectId || ""} onChange={e => set("projectId", e.target.value || null)}>
                <option value="">No project</option>
                {state.projects.map(p =>
                  <option key={p.id} value={p.id}>{p.name}</option>
                )}
              </select>
            </div>
          </div>
          <div className="row-2">
            <div className="field">
              <div className="field-label">Priority</div>
              <select className="field-input" value={form.priority} onChange={e => set("priority", e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="field">
              <div className="field-label">Status</div>
              <select className="field-input" value={selectedStatus} onChange={e => setStatus(e.target.value)}>
                {selectableStatuses.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
          </div>
          <div className="row-2">
            <div className="field">
              <div className="field-label">Start date</div>
              <input className="field-input" type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} />
            </div>
            <div className="field">
              <div className="field-label">Due date</div>
              <input className="field-input" type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} />
            </div>
          </div>
          <div className="field">
            <div className="field-label">Tags (comma separated)</div>
            <input className="field-input" value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Tags" />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-primary" onClick={save} disabled={!form.title.trim()}>
            {isNew ? "Create task" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
