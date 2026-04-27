// MYT — data layer (Supabase-backed)
// Globals: window.MYT
//
// Phase 2 strategy:
//   * load()  — async; fetches users / projects / tasks / notifications in parallel
//                and assembles them into the same shape the UI was using before.
//   * save()  — synchronous; diffs current state vs the previously synced state
//                by reference equality (since every mutation site does
//                {...state, tasks: state.tasks.map(...)}, only the changed
//                rows have new object identity) and fires upserts/deletes in
//                the background. Errors are logged to console.
//   * currentUserId stays in localStorage as session state — it's not a row.

(function () {
  const SESSION_KEY = "myt-session-v1";
  const sb = () => window.MYT_supabase;

  // ---------- small utilities used across the UI ----------
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const dayOffset = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };

  const AVATAR_COLORS = [
    "#2563eb", "#7c3aed", "#db2777", "#ea580c",
    "#16a34a", "#0891b2", "#9333ea", "#e11d48",
    "#0d9488", "#ca8a04", "#4f46e5", "#dc2626"
  ];

  const colorFor = (id) => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
  };

  const initials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // ---------- DB load / save ----------
  let lastState = null;

  function emptyState() {
    return { users: [], projects: [], tasks: [], notifications: [], currentUserId: null };
  }

  async function load() {
    const client = sb();
    if (!client) {
      console.error("Supabase client not initialised");
      return emptyState();
    }

    const [usersRes, projectsRes, tasksRes, notifsRes] = await Promise.all([
      client.from("users").select("*"),
      client.from("projects").select("*"),
      client.from("tasks").select("*"),
      client.from("notifications").select("*").order("ts", { ascending: false })
    ]);

    if (usersRes.error)    console.error("[users] load:",         usersRes.error);
    if (projectsRes.error) console.error("[projects] load:",      projectsRes.error);
    if (tasksRes.error)    console.error("[tasks] load:",         tasksRes.error);
    if (notifsRes.error)   console.error("[notifications] load:", notifsRes.error);

    let session = {};
    try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || "{}"); } catch (_e) {}

    const state = {
      users:         usersRes.data    || [],
      projects:      projectsRes.data || [],
      tasks:         tasksRes.data    || [],
      notifications: notifsRes.data   || [],
      currentUserId: session.currentUserId || null
    };
    lastState = state;
    return state;
  }

  function save(state) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ currentUserId: state.currentUserId }));
    } catch (_e) {}

    if (!sb()) return;
    if (!lastState) { lastState = state; return; }

    syncTable("users",         state.users,         lastState.users);
    syncTable("projects",      state.projects,      lastState.projects);
    syncTable("tasks",         state.tasks,         lastState.tasks);
    syncTable("notifications", state.notifications, lastState.notifications);

    lastState = state;
  }

  async function syncTable(table, current, prev) {
    const prevById = new Map(prev.map(x => [x.id, x]));
    const currIds  = new Set(current.map(x => x.id));

    const toUpsert = current.filter(x => prevById.get(x.id) !== x);
    const toDelete = prev.filter(x => !currIds.has(x.id)).map(x => x.id);

    if (toUpsert.length) {
      const { error } = await sb().from(table).upsert(toUpsert);
      if (error) console.error(`[${table}] upsert failed:`, error);
    }
    if (toDelete.length) {
      const { error } = await sb().from(table).delete().in("id", toDelete);
      if (error) console.error(`[${table}] delete failed:`, error);
    }
  }

  function reset() {
    localStorage.removeItem(SESSION_KEY);
    lastState = null;
  }

  // ---------- date / format helpers ----------
  const formatDue = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso + "T00:00:00");
    const today = new Date(); today.setHours(0,0,0,0);
    const diff = Math.round((d - today) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    if (diff < 0 && diff > -7) return `${Math.abs(diff)}d overdue`;
    if (diff > 0 && diff < 7) return `In ${diff}d`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const dueClass = (iso, status) => {
    if (status === "done") return "";
    if (!iso) return "";
    const d = new Date(iso + "T00:00:00");
    const today = new Date(); today.setHours(0,0,0,0);
    const diff = Math.round((d - today) / 86400000);
    if (diff < 0) return "overdue";
    if (diff === 0) return "today";
    return "";
  };

  const formatRelTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff/86400)}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const STATUS_LABELS = {
    "todo": "To Do",
    "in-progress": "In Progress",
    "review": "Review",
    "done": "Done",
    "blocked": "Blocked"
  };

  const PRIORITY_LABELS = {
    "high": "High",
    "medium": "Medium",
    "low": "Low"
  };

  const STATUS_ORDER = ["todo", "in-progress", "review", "blocked", "done"];
  const PRIORITY_ORDER = ["high", "medium", "low"];

  window.MYT = {
    load, save, reset,
    todayISO, dayOffset,
    colorFor, initials,
    formatDue, dueClass, formatRelTime,
    STATUS_LABELS, PRIORITY_LABELS, STATUS_ORDER, PRIORITY_ORDER
  };
})();
