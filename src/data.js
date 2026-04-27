// MYT — data layer (Supabase-backed)
//
// load()  — async; fetches users / projects / tasks / notifications in parallel
//            and assembles them into the same shape the UI was using before.
// save()  — synchronous; diffs current state vs the previously synced state by
//            reference equality (every mutation site does {...state, tasks:
//            state.tasks.map(...)}, so only the changed rows have new identity)
//            and fires upserts/deletes in the background. Errors -> console.
// currentUserId stays in localStorage as session state — not a row.

import { supabase } from './supabase.js';

const SESSION_KEY = "myt-session-v1";

// ---------- small utilities used across the UI ----------
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const dayOffset = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const AVATAR_COLORS = [
  "#2563eb", "#7c3aed", "#db2777", "#ea580c",
  "#16a34a", "#0891b2", "#9333ea", "#e11d48",
  "#0d9488", "#ca8a04", "#4f46e5", "#dc2626"
];

export const colorFor = (id) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

export const initials = (name) => {
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

export async function load() {
  const [usersRes, projectsRes, tasksRes, notifsRes] = await Promise.all([
    supabase.from("users").select("*"),
    supabase.from("projects").select("*"),
    supabase.from("tasks").select("*"),
    supabase.from("notifications").select("*").order("ts", { ascending: false })
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

export function save(state) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ currentUserId: state.currentUserId }));
  } catch (_e) {}

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
    const { error } = await supabase.from(table).upsert(toUpsert);
    if (error) console.error(`[${table}] upsert failed:`, error);
  }
  if (toDelete.length) {
    const { error } = await supabase.from(table).delete().in("id", toDelete);
    if (error) console.error(`[${table}] delete failed:`, error);
  }
}

export function reset() {
  localStorage.removeItem(SESSION_KEY);
  lastState = null;
}

// ---------- date / format helpers ----------
export const formatDue = (iso) => {
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

export const dueClass = (iso, status) => {
  if (status === "done") return "";
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((d - today) / 86400000);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  return "";
};

export const formatRelTime = (ts) => {
  const d = new Date(ts);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff/86400)}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export const STATUS_LABELS = {
  "todo": "To Do",
  "in-progress": "In Progress",
  "review": "Review",
  "done": "Done",
  "blocked": "Blocked"
};

export const PRIORITY_LABELS = {
  "high": "High",
  "medium": "Medium",
  "low": "Low"
};

export const STATUS_ORDER = ["todo", "in-progress", "review", "blocked", "done"];
export const PRIORITY_ORDER = ["high", "medium", "low"];
