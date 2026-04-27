// MYT — Task drawer (detail view) + create/edit modal

function TaskDrawer({ taskId, state, setState, onClose, currentUser }) {
  const task = state.tasks.find(t => t.id === taskId);
  const [tab, setTab] = React.useState("comments");
  const [comment, setComment] = React.useState("");
  const [editing, setEditing] = React.useState(false);
  if (!task) return null;

  const assignee = state.users.find(u => u.id === task.assigneeId);
  const project = state.projects.find(p => p.id === task.projectId);
  const isAdmin = currentUser.role === "admin";

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
    updateTask({ status: s }, `moved status to ${window.MYT.STATUS_LABELS[s]}`);
  };

  const reassignToAdmin = () => {
    const admin = state.users.find(u => u.role === "admin");
    updateTask({ assigneeId: admin.id }, `reassigned to ${admin.name}`);
  };

  const deleteTask = () => {
    if (!confirm("Delete this task? This cannot be undone.")) return;
    setState({ ...state, tasks: state.tasks.filter(t => t.id !== taskId) });
    onClose();
  };

  if (editing) {
    return (
      <TaskEditModal
        state={state} setState={setState}
        task={task}
        onClose={() => setEditing(false)}
        currentUser={currentUser}
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
              {isAdmin || currentUser.id === task.assigneeId ? (
                <select className="field-input" style={{ width: "auto", padding: "5px 8px", fontSize: 13 }}
                  value={task.status} onChange={e => setStatus(e.target.value)}>
                  {window.MYT.STATUS_ORDER.map(s => <option key={s} value={s}>{window.MYT.STATUS_LABELS[s]}</option>)}
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
                        <span>{window.MYT.formatRelTime(c.ts)}</span>
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
                      <div className="activity-time">{window.MYT.formatRelTime(a.ts)}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="drawer-foot">
          {!isAdmin && currentUser.id === task.assigneeId && (
            <>
              {task.status !== "done" && (
                <button className="btn btn-primary" onClick={() => setStatus("done")}>
                  <Icon name="check" size={14} /> Mark as done
                </button>
              )}
              {task.status !== "in-progress" && task.status !== "done" && (
                <button className="btn btn-secondary" onClick={() => setStatus("in-progress")}>
                  Start working
                </button>
              )}
              {task.status !== "blocked" && task.status !== "done" && (
                <button className="btn btn-secondary" onClick={() => setStatus("blocked")}>
                  Mark blocked
                </button>
              )}
              <button className="btn btn-ghost" onClick={reassignToAdmin}>Reassign to admin</button>
            </>
          )}
          {isAdmin && (
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

function TaskEditModal({ task, state, setState, onClose, currentUser }) {
  const isNew = !task;
  const [form, setForm] = React.useState(task ? { ...task } : {
    id: "t-" + Date.now(),
    title: "",
    description: "",
    assigneeId: state.users.find(u => u.role === "user")?.id || "",
    projectId: state.projects[0]?.id || "",
    priority: "medium",
    status: "todo",
    startDate: window.MYT.todayISO(),
    dueDate: window.MYT.dayOffset(3),
    tags: [],
    attachments: [],
    comments: [],
    activity: []
  });
  const [tagInput, setTagInput] = React.useState((task?.tags || []).join(", "));

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.title.trim()) return;
    const tags = tagInput.split(",").map(s => s.trim()).filter(Boolean);
    const next = { ...state };
    if (isNew) {
      const newTask = { ...form, tags, activity: [{
        ts: new Date().toISOString().slice(0, 16),
        actor: currentUser.id, text: "created task"
      }]};
      next.tasks = [newTask, ...state.tasks];
    } else {
      next.tasks = state.tasks.map(t => t.id === form.id ? {
        ...form,
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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 560 }}>
        <div className="modal-head">
          <div style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>
            {isNew ? "New task" : "Edit task"}
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" /></button>
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
                {state.users.filter(u => u.role === "user").map(u =>
                  <option key={u.id} value={u.id}>{u.name}</option>
                )}
              </select>
            </div>
            <div className="field">
              <div className="field-label">Project</div>
              <select className="field-input" value={form.projectId} onChange={e => set("projectId", e.target.value)}>
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
              <select className="field-input" value={form.status} onChange={e => set("status", e.target.value)}>
                {window.MYT.STATUS_ORDER.map(s => <option key={s} value={s}>{window.MYT.STATUS_LABELS[s]}</option>)}
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
            <input className="field-input" value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="BOM, engineering" />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={!form.title.trim()}>
            {isNew ? "Create task" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TaskDrawer, TaskEditModal });
