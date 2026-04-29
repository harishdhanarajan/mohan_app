// MYT — shared UI atoms

import React from 'react';
import { colorFor, initials, dueClass, formatDue, PRIORITY_LABELS, STATUS_LABELS } from './data.js';

export function Avatar({ user, size }) {
  if (!user) return null;
  const klass = size === "sm" ? "avatar avatar-sm" : size === "lg" ? "avatar avatar-lg" : "avatar";
  return React.createElement("div", {
    className: klass,
    style: { background: colorFor(user.id) },
    title: user.name
  }, initials(user.name));
}

export function Icon({ name, size = 16 }) {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1.5"/><circle cx="4" cy="12" r="1.5"/><circle cx="4" cy="18" r="1.5"/></>,
    kanban: <><rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="10" rx="1.5"/><rect x="17" y="4" width="4" height="13" rx="1.5"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></>,
    users: <><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M15 14.5c2.4 0 4 1.6 4 3.5"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    bell: <><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9z"/><path d="M10 21a2 2 0 004 0"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>,
    chat: <path d="M21 12a8 8 0 11-3.5-6.6L21 4l-1 4.5A8 8 0 0121 12zM8 11h.01M12 11h.01M16 11h.01"/>,
    send: <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>,
    close: <path d="M6 6l12 12M6 18L18 6"/>,
    check: <path d="M5 12l5 5L20 7"/>,
    chevronLeft: <path d="M15 6l-6 6 6 6"/>,
    chevronRight: <path d="M9 6l6 6-6 6"/>,
    chevronDown: <path d="M6 9l6 6 6-6"/>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 113 3L7 19l-4 1 1-4 12.5-12.5z"/></>,
    trash: <><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></>,
    paperclip: <path d="M21.4 11l-9.2 9.2a5 5 0 01-7.1-7.1l9.2-9.2a3.5 3.5 0 015 5l-9.2 9.2a2 2 0 01-2.8-2.8l8.5-8.5"/>,
    flag: <><path d="M4 21V4M4 4h12l-2 4 2 4H4"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></>,
    logout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></>,
    activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>,
    sparkle: <path d="M12 3l1.5 5L19 9.5 13.5 11 12 16l-1.5-5L5 9.5 10.5 8 12 3zM19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2zM5 16l.7 2 2 .7-2 .7L5 21l-.7-2-2-.7 2-.7.7-2z"/>,
    folder: <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>,
    filter: <path d="M3 5h18l-7 9v6l-4-2v-4L3 5z"/>,
    refresh: <><path d="M3 12a9 9 0 0115-6.7L21 8M21 3v5h-5M21 12a9 9 0 01-15 6.7L3 16M3 21v-5h5"/></>
  };
  const p = paths[name];
  if (!p) return null;
  return React.createElement("svg", {
    width: size, height: size, viewBox: "0 0 24 24",
    fill: "none", stroke: "currentColor", strokeWidth: 1.8,
    strokeLinecap: "round", strokeLinejoin: "round",
    style: { flexShrink: 0 }
  }, p);
}

export function Badge({ kind, children }) {
  return <span className={`badge ${kind}`}>{children}</span>;
}

export function PriorityBadge({ priority }) {
  const k = priority === "high" ? "badge-priority-high" : priority === "medium" ? "badge-priority-med" : "badge-priority-low";
  const dot = priority === "high" ? "var(--priority-high)" : priority === "medium" ? "var(--priority-med)" : "var(--priority-low)";
  return (
    <span className={`badge ${k}`}>
      <span className="badge-dot" style={{ background: dot }}></span>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function StatusBadge({ status }) {
  const map = {
    "todo": "badge-status badge-todo",
    "in-progress": "badge-progress",
    "review": "badge-review",
    "done": "badge-done"
  };
  return (
    <span className={`badge ${map[status] || "badge-status"}`}>
      <span className="badge-dot"></span>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function DueCell({ task }) {
  const cls = dueClass(task.dueDate, task.status);
  return (
    <span className={`due-cell ${cls}`}>
      <Icon name="clock" size={12} />
      {formatDue(task.dueDate)}
    </span>
  );
}
