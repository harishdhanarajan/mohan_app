// MYT — Views (List, Kanban, Calendar)

import React from 'react';
import { Avatar, Icon, PriorityBadge, StatusBadge, DueCell } from './atoms.jsx';

export function TaskListView({ tasks, state, onOpen, currentUser, onToggleDone }) {
  if (!tasks.length) {
    return <div className="empty"><div className="empty-title">No tasks match.</div>Try adjusting your filters.</div>;
  }
  return (
    <div className="tasklist">
      <div className="task-row-grid task-row-head">
        <div></div>
        <div></div>
        <div>Task</div>
        <div>Priority</div>
        <div>Status</div>
        <div>Assignee</div>
        <div>Due</div>
        <div>Comments</div>
      </div>
      {tasks.map(t => {
        const a = state.users.find(u => u.id === t.assigneeId);
        const p = state.projects.find(p => p.id === t.projectId);
        const canCheck = t.status !== "done" && (currentUser.role === "admin" || currentUser.id === t.assigneeId);
        return (
          <div key={t.id} className="task-row-grid" onClick={() => onOpen(t.id)}>
            <div onClick={e => { e.stopPropagation(); if (canCheck) onToggleDone(t.id); }}>
              <div className={`checkbox ${t.status === "done" ? "checked" : ""}`}>
                {t.status === "done" && <Icon name="check" size={12} />}
              </div>
            </div>
            <div className={`task-prio-stripe prio-${t.priority === "medium" ? "med" : t.priority}`}></div>
            <div className="task-title">
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className={t.status === "done" ? "strike" : ""} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.title}
                </div>
                <div className="task-meta-tags">
                  <span>{p?.name}</span>
                  {t.tags?.length > 0 && <><span className="dot-sep"></span>{t.tags.slice(0, 2).join(", ")}</>}
                </div>
              </div>
            </div>
            <div><PriorityBadge priority={t.priority} /></div>
            <div><StatusBadge status={t.status} /></div>
            <div className="assignee-cell">
              <Avatar user={a} size="sm" />
              <span>{a?.name?.split(" ")[0]}</span>
            </div>
            <div><DueCell task={t} /></div>
            <div style={{ fontSize: 12.5, color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 5 }}>
              <Icon name="chat" size={12} />
              {t.comments?.length || 0}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function KanbanView({ tasks, state, onOpen, onMoveTask }) {
  const cols = [
    { id: "todo", label: "To Do" },
    { id: "in-progress", label: "In Progress" },
    { id: "review", label: "Review" },
    { id: "done", label: "Done" }
  ];
  const [dragOver, setDragOver] = React.useState(null);

  const onDragStart = (e, taskId) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
  };

  const onDrop = (e, status) => {
    e.preventDefault();
    setDragOver(null);
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) onMoveTask(taskId, status);
  };

  return (
    <div className="kanban">
      {cols.map(col => {
        const colTasks = tasks.filter(t => t.status === col.id || (col.id === "todo" && t.status === "blocked"));
        return (
          <div
            className={`kanban-col ${dragOver === col.id ? "drag-over" : ""}`}
            key={col.id}
            onDragOver={e => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setDragOver(col.id);
            }}
            onDragLeave={e => {
              if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null);
            }}
            onDrop={e => onDrop(e, col.id)}
          >
            <div className="kanban-col-head">
              <StatusBadge status={col.id} />
              <span className="kanban-col-count">{colTasks.length}</span>
            </div>
            <div className="kanban-col-body">
              {colTasks.map(t => {
                const a = state.users.find(u => u.id === t.assigneeId);
                const prio = t.priority === "medium" ? "med" : t.priority;
                return (
                  <div
                    key={t.id}
                    className={`kanban-card prio-${prio}-edge ${t.status === "done" ? "is-done" : ""}`}
                    draggable={t.status !== "done"}
                    onDragStart={e => onDragStart(e, t.id)}
                    onClick={() => onOpen(t.id)}
                  >
                    <div className="kc-title">{t.title}</div>
                    <div className="kc-meta">
                      <Avatar user={a} size="sm" />
                      <DueCell task={t} />
                      {t.comments?.length > 0 && (
                        <span style={{ display: "flex", alignItems: "center", gap: 3, marginLeft: "auto" }}>
                          <Icon name="chat" size={11} /> {t.comments.length}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {colTasks.length === 0 && (
                <div style={{ fontSize: 12, color: "var(--text-quaternary)", textAlign: "center", padding: "16px 8px" }}>
                  No tasks
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CalendarView({ tasks, state, onOpen }) {
  const [month, setMonth] = React.useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const first = new Date(month.y, month.m, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const prevDays = new Date(month.y, month.m, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) {
    const d = prevDays - startWeekday + i + 1;
    const date = new Date(month.y, month.m - 1, d);
    cells.push({ d, otherMonth: true, dateStr: date.toISOString().slice(0, 10) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(month.y, month.m, d);
    cells.push({ d, otherMonth: false, dateStr: date.toISOString().slice(0, 10) });
  }
  while (cells.length % 7 !== 0) {
    const d = cells.length - daysInMonth - startWeekday + 1;
    const date = new Date(month.y, month.m + 1, d);
    cells.push({ d, otherMonth: true, dateStr: date.toISOString().slice(0, 10) });
  }

  const monthName = new Date(month.y, month.m, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const move = (delta) => {
    const d = new Date(month.y, month.m + delta, 1);
    setMonth({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <div className="calendar">
      <div className="cal-head">
        <div style={{ fontWeight: 600, fontSize: 15, flex: 1 }}>{monthName}</div>
        <button className="icon-btn" onClick={() => move(-1)}><Icon name="chevronLeft" /></button>
        <button className="btn btn-secondary btn-sm" onClick={() => {
          const d = new Date(); setMonth({ y: d.getFullYear(), m: d.getMonth() });
        }}>Today</button>
        <button className="icon-btn" onClick={() => move(1)}><Icon name="chevronRight" /></button>
      </div>
      <div className="cal-grid">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d =>
          <div key={d} className="cal-dow">{d}</div>
        )}
        {cells.map((c, i) => {
          const dayTasks = tasks.filter(t => t.dueDate === c.dateStr);
          return (
            <div key={i} className={`cal-cell ${c.otherMonth ? "other-month" : ""} ${c.dateStr === todayStr ? "today" : ""}`}>
              <div className="cal-day">{c.d}</div>
              {dayTasks.slice(0, 3).map(t => {
                const prio = t.priority === "medium" ? "med" : t.priority;
                return (
                  <div key={t.id}
                    className={`cal-task prio-${prio}-edge ${t.status === "done" ? "done" : ""}`}
                    onClick={() => onOpen(t.id)}
                    title={t.title}>
                    {t.title}
                  </div>
                );
              })}
              {dayTasks.length > 3 && (
                <div style={{ fontSize: 11, color: "var(--text-tertiary)", padding: "0 6px" }}>
                  +{dayTasks.length - 3} more
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
