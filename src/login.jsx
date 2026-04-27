import React from 'react';

export function Login({ state, setState }) {
  const isSetup = state.users.length === 0;
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [err, setErr] = React.useState("");

  const submit = (e) => {
    e && e.preventDefault();

    if (isSetup) {
      if (!name.trim() || !email.trim() || !password.trim()) {
        setErr("Name, email, and password are required.");
        return;
      }

      const admin = {
        id: "u-" + Date.now(),
        name: name.trim(),
        email: email.trim(),
        password,
        role: "admin",
        title: "Administrator"
      };
      setState({ ...state, users: [admin], currentUserId: admin.id });
      return;
    }

    const user = state.users.find(user =>
      user.email.toLowerCase() === email.trim().toLowerCase() &&
      user.password === password
    );
    if (!user) {
      setErr("Invalid email or password.");
      return;
    }
    setState({ ...state, currentUserId: user.id });
  };

  return (
    <div className="login-shell">
      <div className="login-pane">
        <form className="login-form" onSubmit={submit}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
            <div className="brand-mark" style={{ width: 32, height: 32, fontSize: 13 }}>M</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>MYT</div>
              <div style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>My Task List</div>
            </div>
          </div>

          <h1>{isSetup ? "Create your admin account" : "Sign in to your workspace"}</h1>
          <div className="sub">
            {isSetup
              ? "Start with an empty workspace and add your own team, projects, and tasks."
              : "Manage tasks, track team workload, and stay on top of priorities."}
          </div>

          {isSetup && (
            <div className="field">
              <div className="field-label">Name</div>
              <input
                className="field-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Full name"
                autoFocus
              />
            </div>
          )}

          <div className="field">
            <div className="field-label">Email</div>
            <input
              className="field-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              autoFocus={!isSetup}
            />
          </div>
          <div className="field">
            <div className="field-label">Password</div>
            <input
              className="field-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
            />
          </div>

          {err && (
            <div style={{
              background: "var(--danger-soft)", color: "var(--danger)",
              padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12,
              border: "1px solid #fecaca"
            }}>{err}</div>
          )}

          <button type="submit" className="btn btn-primary btn-block">
            {isSetup ? "Create workspace" : "Sign in"}
          </button>
        </form>
      </div>

      <div className="login-art">
        <div className="login-art-grid"></div>
        <div className="login-mock">
          <div className="login-mock-head">
            <div className="login-mock-dot"></div>
            <div className="login-mock-dot"></div>
            <div className="login-mock-dot"></div>
          </div>
          <div className="login-mock-body">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Workspace</div>
            <div className="empty" style={{ padding: 18 }}>
              <div className="empty-title">Empty workspace</div>
              Add your own projects, team, and tasks after setup.
            </div>
          </div>
        </div>
        <div className="login-art-content">
          <h2>Less chasing.<br />More shipping.</h2>
          <p>A clean, focused workspace for assigning, tracking, and closing tasks across your team.</p>
        </div>
      </div>
    </div>
  );
}
