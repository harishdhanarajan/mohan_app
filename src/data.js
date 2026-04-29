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

export async function load() {
  const { data: sessionData } = await supabase.auth.getSession();
  const authUserId = sessionData.session?.user.id || null;

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

  const users = usersRes.data || [];
  const me = authUserId ? users.find(u => u.auth_user_id === authUserId) : null;

  const state = {
    users,
    projects:      projectsRes.data || [],
    tasks:         tasksRes.data    || [],
    notifications: notifsRes.data   || [],
    currentUserId: me?.id || null
  };
  lastState = state;
  return state;
}

export function save(state) {
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

export async function hasAnyAdmin() {
  const { data, error } = await supabase.rpc("workspace_has_admin");
  if (error) throw error;
  return Boolean(data);
}

export async function signInWithEmail(email, password) {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password
  });
  if (error) throw error;
}

export async function signUpFirstAdmin({ name, email, password }) {
  const cleanEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signUp({ email: cleanEmail, password });
  if (error) throw error;
  const authUserId = data.user?.id;
  if (!authUserId) throw new Error("Sign up did not return a user id. Confirm email may be enabled.");
  const profile = {
    id: "u-" + Date.now(),
    auth_user_id: authUserId,
    name: name.trim(),
    email: cleanEmail,
    password: "managed-by-supabase-auth",
    role: "admin",
    title: "Administrator"
  };
  const { error: insertError } = await supabase.from("users").insert(profile);
  if (insertError) throw insertError;
  return profile;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
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
  "done": "Done"
};

export const PRIORITY_LABELS = {
  "high": "High",
  "medium": "Medium",
  "low": "Low"
};

export const STATUS_ORDER = ["todo", "in-progress", "review", "done"];
export const PRIORITY_ORDER = ["high", "medium", "low"];
