// MYT — main App: routes between login and the workspace shell.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar, Icon } from './atoms.jsx';
import { ChatAssistant } from './chat.jsx';
import { Dashboard } from './dashboard.jsx';
import { load, save, signOut as signOutAuth, formatRelTime, PRIORITY_LABELS, STATUS_LABELS, STATUS_ORDER } from './data.js';
import { Login } from './login.jsx';
import { supabase } from './supabase.js';
import { ProjectsPage } from './projects-page.jsx';
import { TaskDrawer, TaskEditModal } from './task-drawer.jsx';
import { TweaksPanel, TweakButton, TweakRadio, TweakSection, TweakToggle, useTweaks } from './tweaks-panel.jsx';
import { UsersPage } from './users-page.jsx';
import { CalendarView, KanbanView, TaskListView } from './views.jsx';

const PAGE_ROUTES = {
  dashboard: "dashboard",
  tasks: "tasks",
  kanban: "board",
  calendar: "calendar",
  users: "team",
  projects: "projects"
};

const ROUTE_PAGES = {
  dashboard: "dashboard",
  tasks: "tasks",
  board: "kanban",
  kanban: "kanban",
  calendar: "calendar",
  team: "users",
  users: "users",
  projects: "projects"
};

const USER_PAGES = new Set(["tasks", "kanban", "calendar"]);
const INITIAL_CHAT_MESSAGES = [
  {
    role: "assistant",
    text: "Hi. I'm your task assistant. Ask me about workload, due dates, comments, or specific tasks in this workspace."
  }
];

function defaultPageFor(isAdmin) {
  return isAdmin ? "dashboard" : "tasks";
}

function routeSegment() {
  const hashSegment = window.location.hash.replace(/^#\/?/, "").split(/[/?]/)[0];
  if (hashSegment) return hashSegment;
  return window.location.pathname.replace(/^\/+/, "").split(/[/?]/)[0];
}

function normalizePage(page, isAdmin) {
  if (!page) return defaultPageFor(isAdmin);
  if (!PAGE_ROUTES[page]) return defaultPageFor(isAdmin);
  if (!isAdmin && !USER_PAGES.has(page)) return "tasks";
  return page;
}

function pageFromLocation(isAdmin) {
  return normalizePage(ROUTE_PAGES[routeSegment()], isAdmin);
}

function pathForPage(page) {
  return `/${PAGE_ROUTES[page] || PAGE_ROUTES.tasks}`;
}

function useAppState() {
  const [state, setState] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const refresh = useCallback(() => {
    return load()
      .then(s => { setState(s); setLoadError(null); return s; })
      .catch(e => { console.error(e); setLoadError(e); });
  }, []);

  useEffect(() => {
    let mounted = true;
    refresh();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      if (mounted) refresh();
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [refresh]);

  useEffect(() => { if (state) save(state); }, [state]);
  return [state, setState, loadError, refresh];
}

function LoadingScreen({ message }) {
  return (
    <div className="loading-screen">
      <div className="loading-card">
        <div style={{ textAlign: "center", color: "var(--text-secondary)" }}>
          <div className="brand-mark" style={{ margin: "0 auto 16px" }}>M</div>
          <div style={{ fontSize: 14 }}>{message || "Loading workspace…"}</div>
        </div>
      </div>
    </div>
  );
}

function ErrorScreen({ error }) {
  return (
    <div className="login-shell">
      <div className="login-pane" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 420, padding: 24 }}>
          <h1 style={{ fontSize: 18, marginBottom: 8 }}>Couldn't reach the database</h1>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
            {error?.message || String(error)}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
            Check the Supabase URL and anon key in <code>supabase.js</code>, then reload.
          </div>
        </div>
      </div>
    </div>
  );
}

const NAV_ITEMS_ADMIN = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "tasks", label: "All tasks", icon: "list" },
  { id: "kanban", label: "Board", icon: "kanban" },
  { id: "calendar", label: "Calendar", icon: "calendar" },
  { id: "users", label: "Team", icon: "users" },
  { id: "projects", label: "Projects", icon: "folder" }
];
const NAV_ITEMS_USER = [
  { id: "tasks", label: "My tasks", icon: "list" },
  { id: "kanban", label: "Board", icon: "kanban" },
  { id: "calendar", label: "Calendar", icon: "calendar" }
];

function Sidebar({ current, onNav, currentUser, state, onLogout }) {
  const items = currentUser.role === "admin" ? NAV_ITEMS_ADMIN : NAV_ITEMS_USER;
  const counts = {
    tasks: currentUser.role === "admin"
      ? state.tasks.filter(t => t.status !== "done").length
      : state.tasks.filter(t => t.assigneeId === currentUser.id && t.status !== "done").length
  };
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">M</div>
        <div>
          <div className="brand-name">MYT</div>
          <div className="brand-sub">My Task List</div>
        </div>
      </div>
      <div className="sidebar-nav">
        <div className="sidebar-section-label">Workspace</div>
        {items.map(it => (
          <button
            key={it.id}
            className={`nav-item ${current === it.id ? "active" : ""}`}
            onClick={() => onNav(it.id)}
          >
            <Icon name={it.icon} />
            <span>{it.label}</span>
            {counts[it.id] !== undefined && counts[it.id] > 0 && (
              <span className="nav-count">{counts[it.id]}</span>
            )}
          </button>
        ))}

        {currentUser.role === "admin" && (
          <>
            <div className="sidebar-section-label">Projects</div>
            {state.projects.map(p => (
              <button key={p.id} className="nav-item" onClick={() => onNav("projects")}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }}></span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                <span className="nav-count">{state.tasks.filter(t => t.projectId === p.id && t.status !== "done").length}</span>
              </button>
            ))}
          </>
        )}
      </div>
      <div className="sidebar-foot">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar user={currentUser} />
          <div className="user-chip-meta">
            <div className="user-chip-name">{currentUser.name}</div>
            <div className="user-chip-role">{currentUser.role === "admin" ? "Administrator" : currentUser.title}</div>
          </div>
          <button className="icon-btn" onClick={onLogout} title="Sign out"><Icon name="logout" size={15} /></button>
        </div>
      </div>
    </aside>
  );
}

function Notifications({ state, setState, onOpen }) {
  const [open, setOpen] = useState(false);
  const unread = state.notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setState({ ...state, notifications: state.notifications.map(n => ({ ...n, read: true })) });
  };

  return (
    <div style={{ position: "relative" }}>
      <button className="icon-btn" onClick={() => setOpen(!open)}>
        <Icon name="bell" size={17} />
        {unread > 0 && <span className="dot"></span>}
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setOpen(false)}></div>
          <div className="notif-pop">
            <div className="notif-head">
              <span style={{ flex: 1 }}>Notifications</span>
              {unread > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={markAllRead} style={{ fontSize: 12 }}>
                  Mark all read
                </button>
              )}
            </div>
            <div className="notif-list">
              {state.notifications.length === 0 ? (
                <div className="empty" style={{ padding: 30 }}><div className="empty-title">No notifications</div>You're all caught up.</div>
              ) : state.notifications.slice(0, 12).map(n => {
                const actor = state.users.find(u => u.id === n.actorId);
                const iconMap = { done: "check", review: "edit", comment: "chat" };
                return (
                  <div key={n.id} className="notif-item" onClick={() => { setOpen(false); onOpen(n.taskId); markAllRead(); }}>
                    <div className="notif-icon"><Icon name={iconMap[n.kind] || "bell"} size={14} /></div>
                    <div>
                      <div className="notif-text">
                        {!n.read && <span style={{ display: "inline-block", width: 6, height: 6, background: "var(--accent)", borderRadius: "50%", marginRight: 6 }}></span>}
                        {n.text}
                      </div>
                      <div className="notif-time">{formatRelTime(n.ts)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Toasts({ items, onDismiss }) {
  if (!items.length) return null;
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {items.map(item => (
        <div key={item.id} className={`toast toast-${item.kind || "error"}`}>
          <div className="toast-text">{item.message}</div>
          <button className="toast-close" onClick={() => onDismiss(item.id)} aria-label="Dismiss message">
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

function ConfirmDialog({ dialog, onCancel }) {
  if (!dialog) return null;
  const confirm = () => {
    dialog.onConfirm?.();
    onCancel();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal confirm-modal">
        <div className="modal-head">
          <div style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>{dialog.title}</div>
          <button className="icon-btn" onClick={onCancel} title="Close"><Icon name="close" /></button>
        </div>
        <div className="modal-body">
          <div className="confirm-message">{dialog.message}</div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className={`btn ${dialog.kind === "danger" ? "btn-danger" : "btn-primary"}`} onClick={confirm}>
            {dialog.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterBar({ filters, setFilters, state, currentUser, view, setView, onNew }) {
  const isAdmin = currentUser.role === "admin";
  const togglePriority = (p) => setFilters(f => ({ ...f, priority: f.priority === p ? null : p }));
  const toggleStatus = (s) => setFilters(f => ({ ...f, status: f.status === s ? null : s }));

  return (
    <div className="tasklist-toolbar">
      <div style={{ display: "flex", gap: 4 }}>
        {[
          { id: "list", icon: "list" },
          { id: "kanban", icon: "kanban" },
          { id: "calendar", icon: "calendar" }
        ].map(v => (
          <button key={v.id} className={`icon-btn ${view === v.id ? "" : ""}`}
            onClick={() => setView(v.id)}
            style={view === v.id ? { background: "var(--accent-soft)", color: "var(--accent)" } : {}}>
            <Icon name={v.icon} />
          </button>
        ))}
      </div>
      <div style={{ width: 1, height: 22, background: "var(--border)" }}></div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {["high", "medium", "low"].map(p => (
          <button key={p} className={`chip ${filters.priority === p ? "active" : ""}`} onClick={() => togglePriority(p)}>
            <span className="badge-dot" style={{ background: p === "high" ? "var(--priority-high)" : p === "medium" ? "var(--priority-med)" : "var(--priority-low)" }}></span>
            {PRIORITY_LABELS[p]}
          </button>
        ))}
        {STATUS_ORDER.map(s => (
          <button key={s} className={`chip ${filters.status === s ? "active" : ""}`} onClick={() => toggleStatus(s)}>
            {STATUS_LABELS[s]}
          </button>
        ))}
        {isAdmin && (
          <select className="chip" value={filters.assignee || ""} onChange={e => setFilters(f => ({ ...f, assignee: e.target.value || null }))}
            style={{ paddingRight: 24 }}>
            <option value="">All assignees</option>
            {state.users.filter(u => u.role === "user").map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        )}
      </div>

      <div style={{ flex: 1 }}></div>

      {isAdmin && (
        <button className="btn btn-primary btn-sm" onClick={onNew}>
          <Icon name="plus" size={13} /> New task
        </button>
      )}
    </div>
  );
}

function Workspace({ state, setState, onLogout, tweaks }) {
  const currentUser = state.users.find(u => u.id === state.currentUserId);
  const isAdmin = currentUser.role === "admin";
  const [page, setPageState] = useState(() => pageFromLocation(isAdmin));
  const [view, setView] = useState("list");
  const [filters, setFilters] = useState({ priority: null, status: null, assignee: null });
  const [search, setSearch] = useState("");
  const [openTaskId, setOpenTaskId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState(() => INITIAL_CHAT_MESSAGES);
  const [chatInput, setChatInput] = useState("");
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const dismissToast = useCallback((id) => {
    setToasts(items => items.filter(item => item.id !== id));
  }, []);

  const notify = useCallback((message, kind = "error") => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts(items => [...items.slice(-3), { id, message, kind }]);
    window.setTimeout(() => dismissToast(id), 4200);
  }, [dismissToast]);

  const requestConfirm = useCallback((dialog) => {
    setConfirmDialog(dialog);
  }, []);

  const setPage = useCallback((nextPage) => {
    const normalized = normalizePage(nextPage, isAdmin);
    setPageState(normalized);
    const nextPath = pathForPage(normalized);
    if (window.location.pathname !== nextPath || window.location.hash) {
      window.history.pushState(null, "", nextPath);
    }
  }, [isAdmin]);

  useEffect(() => {
    const syncFromLocation = () => {
      const normalized = pageFromLocation(isAdmin);
      const desiredPath = pathForPage(normalized);
      setPageState(normalized);
      if (window.location.pathname !== desiredPath || window.location.hash) {
        window.history.replaceState(null, "", desiredPath);
      }
    };
    if (!routeSegment()) {
      window.history.replaceState(null, "", pathForPage(defaultPageFor(isAdmin)));
    }
    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);
    window.addEventListener("hashchange", syncFromLocation);
    return () => {
      window.removeEventListener("popstate", syncFromLocation);
      window.removeEventListener("hashchange", syncFromLocation);
    };
  }, [isAdmin]);

  const visibleTasks = useMemo(() => {
    let list = isAdmin ? state.tasks : state.tasks.filter(t => t.assigneeId === currentUser.id);
    if (filters.priority) list = list.filter(t => t.priority === filters.priority);
    if (filters.status) list = list.filter(t => t.status === filters.status);
    if (filters.assignee) list = list.filter(t => t.assigneeId === filters.assignee);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        (t.tags || []).some(tag => tag.toLowerCase().includes(q)) ||
        (state.users.find(u => u.id === t.assigneeId)?.name || "").toLowerCase().includes(q)
      );
    }
    // sort: priority desc, due asc
    const prioRank = { high: 0, medium: 1, low: 2 };
    return list.slice().sort((a, b) => {
      if (a.status === "done" && b.status !== "done") return 1;
      if (a.status !== "done" && b.status === "done") return -1;
      if (prioRank[a.priority] !== prioRank[b.priority]) return prioRank[a.priority] - prioRank[b.priority];
      return (a.dueDate || "").localeCompare(b.dueDate || "");
    });
  }, [state, filters, search, isAdmin, currentUser]);

  const setTaskStatus = useCallback((id, newStatus) => {
    const task = state.tasks.find(t => t.id === id);
    if (!task || task.status === newStatus) return false;
    if (task.status === "done") return false;
    if (newStatus === "done" && !(task.comments || []).length) {
      notify("Add at least one comment before marking this task as done.");
      return false;
    }

    const admin = currentUser.role === "admin" ? currentUser : state.users.find(u => u.role === "admin");
    if (newStatus === "review" && !admin) {
      notify("No admin user is available to receive review tasks.");
      return false;
    }
    const firstUser = state.users.find(u => u.role === "user");
    const next = { ...state };
    next.tasks = state.tasks.map(t => {
      if (t.id !== id) return t;
      const currentAssignee = state.users.find(u => u.id === t.assigneeId);
      const returningFromReview = task.status === "review" && newStatus !== "review" && currentAssignee?.role === "admin" && firstUser;
      const patch = {
        status: newStatus,
        activity: [...(t.activity || []), {
          ts: new Date().toISOString().slice(0, 16),
          actor: currentUser.id,
          text: `marked as ${STATUS_LABELS[newStatus]}`
        }]
      };
      if (newStatus === "review") {
        patch.assigneeId = admin.id;
        patch.activity = [...patch.activity, {
          ts: new Date().toISOString().slice(0, 16),
          actor: currentUser.id,
          text: `assigned back to ${admin.name}`
        }];
      } else if (returningFromReview) {
        patch.assigneeId = firstUser.id;
        patch.activity = [...patch.activity, {
          ts: new Date().toISOString().slice(0, 16),
          actor: currentUser.id,
          text: `reassigned to ${firstUser.name}`
        }];
      }
      return { ...t, ...patch };
    });
    if (!isAdmin) {
      const notificationText = newStatus === "done"
        ? `${currentUser.name.split(" ")[0]} completed '${task.title}'`
        : `${currentUser.name.split(" ")[0]} moved '${task.title}' to ${STATUS_LABELS[newStatus]}`;
      next.notifications = [{
        id: "n-" + Date.now(),
        ts: new Date().toISOString().slice(0, 16),
        actorId: currentUser.id, taskId: id, kind: newStatus,
        text: notificationText,
        read: false
      }, ...state.notifications];
    }
    setState(next);
    return true;
  }, [currentUser, isAdmin, notify, setState, state]);

  const onToggleDone = (id) => {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    setTaskStatus(id, task.status === "done" ? "in-progress" : "done");
  };

  const pageTitle = {
    dashboard: "Dashboard",
    tasks: isAdmin ? "All tasks" : "My tasks",
    kanban: "Board",
    calendar: "Calendar",
    users: "Team members",
    projects: "Projects"
  }[page] || page;

  const pageSub = {
    dashboard: "Workload overview, priorities, and activity",
    tasks: isAdmin ? `${state.tasks.length} total tasks` : `${visibleTasks.length} tasks assigned to you`,
    kanban: "Drag-style board (click a card to open)",
    calendar: "Tasks by due date",
    users: "Manage team members and access",
    projects: "Create, edit, and remove workstreams"
  }[page] || "";

  // sync view + page for tasks/kanban/calendar
  useEffect(() => {
    if (page === "kanban") setView("kanban");
    else if (page === "calendar") setView("calendar");
    else if (page === "tasks") setView("list");
  }, [page]);

  const setTaskView = (nextView) => {
    setView(nextView);
    if (nextView === "kanban") setPage("kanban");
    else if (nextView === "calendar") setPage("calendar");
    else setPage("tasks");
  };

  return (
    <div className="app">
      <Sidebar current={page} onNav={setPage} currentUser={currentUser} state={state} onLogout={onLogout} />
      <div className="app-main">
        <div className="topbar">
          <div>
            <div className="topbar-title">{pageTitle}</div>
            <div className="topbar-sub">{pageSub}</div>
          </div>
          <div className="topbar-spacer"></div>
          <div className="search-input">
            <Icon name="search" size={14} />
            <input placeholder="Search across workspace…" value={search} onChange={e => setSearch(e.target.value)} onFocus={() => { if (page === "dashboard" || page === "users" || page === "projects") setPage("tasks"); }} />
          </div>
          {isAdmin && <Notifications state={state} setState={setState} onOpen={setOpenTaskId} />}
          {isAdmin && (
            <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
              <Icon name="plus" size={13} /> New task
            </button>
          )}
        </div>

        <div className="page">
          {page === "dashboard" && isAdmin && (
            <Dashboard state={state} onOpen={setOpenTaskId} layout={tweaks.dashLayout} />
          )}
          {page === "users" && isAdmin && (
            <UsersPage state={state} setState={setState} onOpenTask={setOpenTaskId} onNotify={notify} onRequestConfirm={requestConfirm} />
          )}
          {page === "projects" && isAdmin && (
            <ProjectsPage state={state} setState={setState} onOpenTask={setOpenTaskId} onNotify={notify} onRequestConfirm={requestConfirm} />
          )}
          {(page === "tasks" || page === "kanban" || page === "calendar") && (
            <>
              <FilterBar
                filters={filters} setFilters={setFilters}
                state={state} currentUser={currentUser}
                view={view} setView={setTaskView}
                onNew={() => setCreating(true)}
              />
              <div style={{ marginTop: 14 }}>
                {view === "list" && (
                  <TaskListView tasks={visibleTasks} state={state} onOpen={setOpenTaskId} currentUser={currentUser} onToggleDone={onToggleDone} />
                )}
                {view === "kanban" && (
                  <KanbanView tasks={visibleTasks} state={state} onOpen={setOpenTaskId} onMoveTask={setTaskStatus} />
                )}
                {view === "calendar" && (
                  <CalendarView tasks={visibleTasks} state={state} onOpen={setOpenTaskId} />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {openTaskId && (
        <TaskDrawer
          taskId={openTaskId}
          state={state} setState={setState}
          onClose={() => setOpenTaskId(null)}
          currentUser={currentUser}
          onSetStatus={setTaskStatus}
          onNotify={notify}
          onRequestConfirm={requestConfirm}
        />
      )}

      {creating && (
        <TaskEditModal
          state={state} setState={setState}
          task={null}
          onClose={() => setCreating(false)}
          currentUser={currentUser}
          onNotify={notify}
        />
      )}

      {/* Admin AI chat */}
      {isAdmin && tweaks.showChat && !chatOpen && (
        <button className="chat-fab" onClick={() => setChatOpen(true)} title="Ask the assistant">
          <span className="ping"></span>
          <Icon name="sparkle" size={20} />
        </button>
      )}
      {isAdmin && tweaks.showChat && chatOpen && (
        <ChatAssistant
          state={state}
          onOpenTask={setOpenTaskId}
          onClose={() => setChatOpen(false)}
          initialMessages={chatMessages}
          onMessagesChange={setChatMessages}
          initialInput={chatInput}
          onInputChange={setChatInput}
        />
      )}
      <ConfirmDialog dialog={confirmDialog} onCancel={() => setConfirmDialog(null)} />
      <Toasts items={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export function App() {
  const [state, setState, loadError, refresh] = useAppState();

  // Tweaks
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "showChat": true,
    "dashLayout": "balanced"
  }/*EDITMODE-END*/;
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  if (loadError) return <ErrorScreen error={loadError} />;
  if (!state) return <LoadingScreen />;

  const currentUser = state.users.find(u => u.id === state.currentUserId);
  const onLogout = async () => {
    try { await signOutAuth(); } catch (e) { console.error(e); }
  };

  if (!currentUser) {
    return (
      <>
        <Login onAuthChanged={refresh} />
        <TweaksPanel title="Tweaks">
          <TweakSection label="Display">
            <TweakToggle label="Show admin AI chat" value={tweaks.showChat} onChange={v => setTweak("showChat", v)} />
            <TweakRadio label="Dashboard layout" value={tweaks.dashLayout} options={[{value: "balanced", label: "Balanced"}, {value: "compact", label: "Compact"}]} onChange={v => setTweak("dashLayout", v)} />
          </TweakSection>
        </TweaksPanel>
      </>
    );
  }

  return (
    <>
      <Workspace state={state} setState={setState} onLogout={onLogout} tweaks={tweaks} />
      <TweaksPanel title="Tweaks">
        <TweakSection label="Display">
          <TweakToggle label="Show admin AI chat" value={tweaks.showChat} onChange={v => setTweak("showChat", v)} />
          <TweakRadio label="Dashboard layout" value={tweaks.dashLayout} options={[{value: "balanced", label: "Balanced"}, {value: "compact", label: "Compact"}]} onChange={v => setTweak("dashLayout", v)} />
        </TweakSection>
        <TweakSection label="Workspace">
          <TweakButton label="Sign out" onClick={onLogout} />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}
