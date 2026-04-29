// MYT — Admin Dashboard widgets

import React from 'react';
import { Avatar, DueCell, PriorityBadge } from './atoms.jsx';
import { dayOffset, formatRelTime, STATUS_LABELS, STATUS_ORDER, todayISO } from './data.js';

function KPI({ label, value, trend, trendDir }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className={`kpi-trend ${trendDir || ""}`}>{trend}</div>
    </div>
  );
}

function WorkloadWidget({ state }) {
  const userTasks = state.users.map(u => {
    const tasks = state.tasks.filter(t => t.assigneeId === u.id && t.status !== "done");
    const high = tasks.filter(t => t.priority === "high").length;
    const med = tasks.filter(t => t.priority === "medium").length;
    const low = tasks.filter(t => t.priority === "low").length;
    return { user: u, total: tasks.length, high, med, low };
  });
  const max = Math.max(1, ...userTasks.map(x => x.total));
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Team workload</div>
          <div className="card-sub">Open tasks per assignee, including admin review work</div>
        </div>
      </div>
      <div className="card-pad" style={{ paddingTop: 6, paddingBottom: 12 }}>
        {userTasks.map(({ user, total, high, med, low }) => (
          <div key={user.id} className="workload-row">
            <div className="workload-name">
              <Avatar user={user} size="sm" />
              <span className="name">{user.name}</span>
            </div>
            <div className="workload-bar">
              {high > 0 && <div className="seg-high" style={{ width: `${(high / max) * 100}%` }}></div>}
              {med > 0 && <div className="seg-med" style={{ width: `${(med / max) * 100}%` }}></div>}
              {low > 0 && <div className="seg-low" style={{ width: `${(low / max) * 100}%` }}></div>}
            </div>
            <div className="workload-count">{total} open</div>
          </div>
        ))}
        <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 11.5, color: "var(--text-tertiary)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--priority-high)" }}></span>High
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--priority-med)" }}></span>Medium
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--priority-low)" }}></span>Low
          </span>
        </div>
      </div>
    </div>
  );
}

function StatusDonut({ state }) {
  const counts = { todo: 0, "in-progress": 0, review: 0, done: 0 };
  state.tasks.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });
  const total = state.tasks.length;
  const divisor = total || 1;

  const colors = {
    "todo": "#94a3b8",
    "in-progress": "#2563eb",
    "review": "#7c3aed",
    "done": "#16a34a"
  };

  // build donut segments using stroke-dasharray
  let acc = 0;
  const r = 56;
  const C = 2 * Math.PI * r;
  const segs = STATUS_ORDER.map(s => {
    const v = counts[s] || 0;
    const len = (v / divisor) * C;
    const seg = { s, color: colors[s], len, offset: -acc, count: v };
    acc += len;
    return seg;
  });

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Tasks by status</div>
          <div className="card-sub">Distribution across all tasks</div>
        </div>
      </div>
      <div className="card-pad">
        <div className="donut-wrap">
          <svg className="donut" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r={r} fill="none" stroke="var(--bg-subtle)" strokeWidth="18" />
            {segs.map((seg, i) => seg.len > 0 && (
              <circle key={i} cx="70" cy="70" r={r} fill="none"
                stroke={seg.color} strokeWidth="18"
                strokeDasharray={`${seg.len} ${C}`}
                strokeDashoffset={seg.offset}
                transform="rotate(-90 70 70)"
              />
            ))}
            <text x="70" y="68" textAnchor="middle" fontSize="22" fontWeight="600" fill="var(--text)">{total}</text>
            <text x="70" y="86" textAnchor="middle" fontSize="11" fill="var(--text-tertiary)">total</text>
          </svg>
          <div className="donut-legend">
            {STATUS_ORDER.map(s => (
              <div key={s} className="legend-row">
                <div className="legend-swatch" style={{ background: colors[s] }}></div>
                <div>{STATUS_LABELS[s]}</div>
                <div className="legend-count">{counts[s] || 0}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PriorityList({ state, onOpen }) {
  const open = state.tasks.filter(t => t.status !== "done");
  // sort: priority high→low, then due date asc
  const prioRank = { high: 0, medium: 1, low: 2 };
  const sorted = open.slice().sort((a, b) => {
    if (prioRank[a.priority] !== prioRank[b.priority]) return prioRank[a.priority] - prioRank[b.priority];
    return (a.dueDate || "").localeCompare(b.dueDate || "");
  }).slice(0, 8);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Priority queue</div>
          <div className="card-sub">Open tasks, ranked by priority and due date</div>
        </div>
      </div>
      <div>
        {sorted.map(t => {
          const a = state.users.find(u => u.id === t.assigneeId);
          const prio = t.priority === "medium" ? "med" : t.priority;
          return (
            <div key={t.id} onClick={() => onOpen(t.id)} style={{
              display: "grid",
              gridTemplateColumns: "4px 1fr auto auto",
              gap: 12, alignItems: "center",
              padding: "10px 16px",
              borderBottom: "1px solid var(--border)",
              cursor: "pointer"
            }}>
              <div className={`task-prio-stripe prio-${prio}`} style={{ height: 24 }}></div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.title}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 1 }}>
                  {a?.name?.split(" ")[0]} · {state.projects.find(p => p.id === t.projectId)?.name}
                </div>
              </div>
              <DueCell task={t} />
              <PriorityBadge priority={t.priority} />
            </div>
          );
        })}
        {sorted.length === 0 && <div className="empty"><div className="empty-title">All clear.</div>No open tasks.</div>}
      </div>
    </div>
  );
}

function ActivityFeed({ state, onOpen }) {
  // gather activity from all tasks, sort desc, top 8
  const all = [];
  state.tasks.forEach(t => {
    (t.activity || []).forEach(a => all.push({ ...a, task: t }));
  });
  all.sort((a, b) => (b.ts || "").localeCompare(a.ts || ""));
  const top = all.slice(0, 7);
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Recent activity</div>
          <div className="card-sub">Latest updates across the workspace</div>
        </div>
      </div>
      <div className="card-pad">
        {top.map((a, i) => {
          const actor = state.users.find(u => u.id === a.actor);
          return (
            <div className="feed-row" key={i}>
              <Avatar user={actor} size="sm" />
              <div className="feed-msg">
                <span className="author">{actor?.name?.split(" ")[0]}</span> {a.text} —{" "}
                <span style={{ color: "var(--accent)", cursor: "pointer" }} onClick={() => onOpen(a.task.id)}>
                  {a.task.title}
                </span>
              </div>
              <div className="feed-time">{formatRelTime(a.ts)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NoCommentsWidget({ state, onOpen }) {
  const tomorrow = dayOffset(1);
  const today = todayISO();
  const list = state.tasks.filter(t =>
    (t.dueDate === tomorrow || t.dueDate === today) &&
    (!t.comments || t.comments.length === 0) &&
    t.status !== "done"
  );
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Due soon · no comments</div>
          <div className="card-sub">Active tasks due today/tomorrow with no comment activity</div>
        </div>
      </div>
      <div>
        {list.length === 0 ? (
          <div className="empty"><div className="empty-title">All caught up.</div>Every imminent task has activity.</div>
        ) : list.map(t => {
          const a = state.users.find(u => u.id === t.assigneeId);
          return (
            <div key={t.id} onClick={() => onOpen(t.id)} style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              gap: 10, alignItems: "center",
              padding: "10px 16px",
              borderBottom: "1px solid var(--border)",
              cursor: "pointer"
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.title}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 1 }}>
                  {a?.name?.split(" ")[0]} · {state.projects.find(p => p.id === t.projectId)?.name}
                </div>
              </div>
              <DueCell task={t} />
              <PriorityBadge priority={t.priority} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Dashboard({ state, onOpen, layout }) {
  const today = todayISO();
  const overdue = state.tasks.filter(t => t.status !== "done" && t.dueDate < today).length;
  const dueToday = state.tasks.filter(t => t.dueDate === today && t.status !== "done").length;
  const inProgress = state.tasks.filter(t => t.status === "in-progress").length;
  const completed = state.tasks.filter(t => t.status === "done").length;

  if (layout === "compact") {
    return (
      <>
        <div className="kpi-grid">
          <KPI label="Overdue" value={overdue} trend={overdue > 0 ? "Needs attention" : "On track"} trendDir={overdue > 0 ? "down" : "up"} />
          <KPI label="Due today" value={dueToday} trend="Across the team" />
          <KPI label="In progress" value={inProgress} trend={`${state.users.length} assignees`} />
          <KPI label="Completed" value={completed} trend="All time" trendDir="up" />
        </div>
        <div className="dash-row full">
          <PriorityList state={state} onOpen={onOpen} />
        </div>
        <div className="dash-row cols-2">
          <WorkloadWidget state={state} />
          <StatusDonut state={state} />
        </div>
        <div className="dash-row cols-2">
          <NoCommentsWidget state={state} onOpen={onOpen} />
          <ActivityFeed state={state} onOpen={onOpen} />
        </div>
      </>
    );
  }

  // default: balanced
  return (
    <>
      <div className="kpi-grid">
        <KPI label="Overdue" value={overdue} trend={overdue > 0 ? "Needs attention" : "On track"} trendDir={overdue > 0 ? "down" : "up"} />
        <KPI label="Due today" value={dueToday} trend="Across the team" />
        <KPI label="In progress" value={inProgress} trend={`${state.users.length} assignees`} />
        <KPI label="Completed" value={completed} trend="All time" trendDir="up" />
      </div>
      <div className="dash-row cols-2">
        <WorkloadWidget state={state} />
        <StatusDonut state={state} />
      </div>
      <div className="dash-row alt">
        <NoCommentsWidget state={state} onOpen={onOpen} />
        <PriorityList state={state} onOpen={onOpen} />
      </div>
      <div className="dash-row full">
        <ActivityFeed state={state} onOpen={onOpen} />
      </div>
    </>
  );
}
