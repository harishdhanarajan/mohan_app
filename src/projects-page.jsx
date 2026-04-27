import React from 'react';
import { Icon } from './atoms.jsx';
import { todayISO } from './data.js';

const PROJECT_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#16a34a",
  "#ea580c",
  "#0891b2",
  "#db2777",
  "#64748b",
  "#dc2626"
];

function projectIdFromName(name) {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `p-${slug || "project"}-${Date.now()}`;
}

export function ProjectsPage({ state, setState, onOpenTask, onRequestConfirm }) {
  const [editing, setEditing] = React.useState(null);
  const [creating, setCreating] = React.useState(false);
  const today = todayISO();

  const projectStats = (projectId) => {
    const tasks = state.tasks.filter(t => t.projectId === projectId);
    return {
      total: tasks.length,
      open: tasks.filter(t => t.status !== "done").length,
      done: tasks.filter(t => t.status === "done").length,
      overdue: tasks.filter(t => t.status !== "done" && t.dueDate < today).length,
      tasks
    };
  };

  const removeProject = (project) => {
    const stats = projectStats(project.id);
    const suffix = stats.total ? ` ${stats.total} task${stats.total === 1 ? "" : "s"} will become unassigned.` : "";
    onRequestConfirm?.({
      title: "Delete project",
      message: `Delete ${project.name}?${suffix}`,
      confirmLabel: "Delete project",
      kind: "danger",
      onConfirm: () => {
        setState({
          ...state,
          projects: state.projects.filter(p => p.id !== project.id),
          tasks: state.tasks.map(t => t.projectId === project.id ? { ...t, projectId: null } : t)
        });
      }
    });
  };

  return (
    <>
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <h1 className="page-title">Projects</h1>
          <div className="page-sub">{state.projects.length} projects tracking active workstreams</div>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          <Icon name="plus" size={14} /> New project
        </button>
      </div>

      <div className="project-grid">
        {state.projects.map(project => {
          const stats = projectStats(project.id);
          return (
            <div className="project-card" key={project.id}>
              <div className="project-card-head">
                <div className="project-swatch" style={{ background: project.color }}></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="project-card-name">{project.name}</div>
                  <div className="project-card-meta">{stats.open} open tasks</div>
                </div>
                <button className="icon-btn" onClick={() => setEditing(project)} title="Edit project">
                  <Icon name="edit" size={14} />
                </button>
                <button className="icon-btn" onClick={() => removeProject(project)} title="Delete project" style={{ color: "var(--danger)" }}>
                  <Icon name="trash" size={14} />
                </button>
              </div>

              <div className="project-card-stats">
                <div className="user-card-stat"><div className="v">{stats.total}</div><div className="l">Total</div></div>
                <div className="user-card-stat"><div className="v">{stats.open}</div><div className="l">Open</div></div>
                <div className="user-card-stat"><div className="v" style={{ color: stats.overdue ? "var(--danger)" : "inherit" }}>{stats.overdue}</div><div className="l">Overdue</div></div>
              </div>

              <div className="project-task-list">
                {stats.tasks.slice(0, 4).map(task => (
                  <button key={task.id} className="project-task-row" onClick={() => onOpenTask(task.id)}>
                    <span className={`task-prio-stripe prio-${task.priority === "medium" ? "med" : task.priority}`}></span>
                    <span>{task.title}</span>
                  </button>
                ))}
                {stats.tasks.length === 0 && (
                  <div className="project-empty">No tasks assigned.</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {(editing || creating) && (
        <ProjectEditModal
          project={editing}
          state={state}
          setState={setState}
          onClose={() => { setEditing(null); setCreating(false); }}
        />
      )}
    </>
  );
}

function ProjectEditModal({ project, state, setState, onClose }) {
  const isNew = !project;
  const [form, setForm] = React.useState(project ? { ...project } : {
    id: "",
    name: "",
    color: PROJECT_COLORS[0]
  });

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const save = () => {
    const name = form.name.trim();
    if (!name) return;

    const nextProject = {
      id: isNew ? projectIdFromName(name) : form.id,
      name,
      color: form.color || PROJECT_COLORS[0]
    };

    setState({
      ...state,
      projects: isNew
        ? [...state.projects, nextProject]
        : state.projects.map(p => p.id === nextProject.id ? nextProject : p)
    });
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ width: 440 }}>
        <div className="modal-head">
          <div style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>
            {isNew ? "New project" : "Edit project"}
          </div>
          <button className="icon-btn" onClick={onClose} title="Close"><Icon name="close" /></button>
        </div>
        <div className="modal-body">
          <div className="field">
            <div className="field-label">Project name</div>
            <input className="field-input" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Project name" autoFocus />
          </div>
          <div className="field">
            <div className="field-label">Color</div>
            <div className="project-color-row">
              {PROJECT_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`project-color ${form.color === color ? "active" : ""}`}
                  style={{ background: color }}
                  onClick={() => set("color", color)}
                  aria-label={`Use color ${color}`}
                />
              ))}
              <input className="field-input project-color-input" type="color" value={form.color} onChange={e => set("color", e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-primary" onClick={save} disabled={!form.name.trim()}>
            {isNew ? "Create project" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
