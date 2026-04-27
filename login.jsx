// MYT — Login screen

function Login({ state, setState }) {
  const [email, setEmail] = React.useState("mohan@test.com");
  const [password, setPassword] = React.useState("Pass@1234");
  const [err, setErr] = React.useState("");

  const submit = (e) => {
    e && e.preventDefault();
    const u = state.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password);
    if (!u) { setErr("Invalid email or password."); return; }
    setState({ ...state, currentUserId: u.id });
  };

  const fill = (which) => {
    if (which === "admin") { setEmail("mohan@test.com"); setPassword("Pass@1234"); }
    else { setEmail("harish@test.com"); setPassword("Pass@1234"); }
    setErr("");
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

          <h1>Sign in to your workspace</h1>
          <div className="sub">Manage tasks, track team workload, and stay on top of priorities.</div>

          <div className="field">
            <div className="field-label">Email</div>
            <input className="field-input" type="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="you@company.com" autoFocus />
          </div>
          <div className="field">
            <div className="field-label">Password</div>
            <input className="field-input" type="password" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>

          {err && (
            <div style={{
              background: "var(--danger-soft)", color: "var(--danger)",
              padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12,
              border: "1px solid #fecaca"
            }}>{err}</div>
          )}

          <button type="submit" className="btn btn-primary btn-block">Sign in</button>

          <div className="demo-credentials">
            <div style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Demo accounts</div>
            <div className="row"><span className="label">Admin</span> <code>mohan@test.com</code></div>
            <div className="row"><span className="label">User</span> <code>harish@test.com</code></div>
            <div className="row"><span className="label">Password</span> <code>Pass@1234</code></div>
            <div className="quick">
              <button type="button" onClick={() => fill("admin")}>Use admin</button>
              <button type="button" onClick={() => fill("user")}>Use user</button>
            </div>
          </div>
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
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Today's tasks</div>
            <div className="login-mock-row">
              <div style={{ width: 4, height: 24, borderRadius: 2, background: "var(--priority-high)" }}></div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>Finalize BOM for Apollo v2</div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Due tomorrow · Harish</div>
              </div>
              <span className="badge badge-progress"><span className="badge-dot"></span>In Progress</span>
            </div>
            <div className="login-mock-row">
              <div style={{ width: 4, height: 24, borderRadius: 2, background: "var(--priority-med)" }}></div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>Update supplier checklist</div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Due in 3d · Ankit</div>
              </div>
              <span className="badge badge-progress"><span className="badge-dot"></span>In Progress</span>
            </div>
            <div className="login-mock-row">
              <div style={{ width: 4, height: 24, borderRadius: 2, background: "var(--priority-low)" }}></div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>Safety walkthrough — bay 4</div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Yesterday · Sara</div>
              </div>
              <span className="badge badge-done"><span className="badge-dot"></span>Done</span>
            </div>
          </div>
        </div>
        <div className="login-art-content">
          <h2>Less chasing. <br/>More shipping.</h2>
          <p>A clean, focused workspace for assigning, tracking, and closing tasks across your team.</p>
        </div>
      </div>
    </div>
  );
}

window.Login = Login;
