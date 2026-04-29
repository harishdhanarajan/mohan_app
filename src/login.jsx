import React from 'react';
import { hasAnyAdmin, signInWithEmail, signUpFirstAdmin } from './data.js';

export function Login({ onAuthChanged }) {
  const [mode, setMode] = React.useState("loading"); // "loading" | "login" | "setup"
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    hasAnyAdmin()
      .then(has => { if (!cancelled) setMode(has ? "login" : "setup"); })
      .catch(e => {
        if (cancelled) return;
        console.error(e);
        // If we can't tell, default to login — never silently expose the setup form.
        setMode("login");
        setErr("Couldn't reach the server. Please retry.");
      });
    return () => { cancelled = true; };
  }, []);

  const isSetup = mode === "setup";

  const submit = async (e) => {
    e && e.preventDefault();
    if (busy || mode === "loading") return;
    setErr("");

    if (isSetup) {
      if (!name.trim() || !email.trim() || !password.trim()) {
        setErr("Name, User ID, and password are required.");
        return;
      }
    } else if (!email.trim() || !password.trim()) {
      setErr("User ID and password are required.");
      return;
    }

    setBusy(true);
    try {
      if (isSetup) {
        const stillEmpty = !(await hasAnyAdmin());
        if (!stillEmpty) {
          setMode("login");
          throw new Error("An admin already exists. Please sign in instead.");
        }
        await signUpFirstAdmin({ name, email, password });
      } else {
        await signInWithEmail(email, password);
      }
      onAuthChanged?.();
    } catch (error) {
      if (!isSetup) {
        setErr("Invalid User ID or password. Contact Mohanram Musuwathy for further details.");
      } else {
        setErr(error?.message || "Authentication failed.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-pane">
        <form className="login-form" onSubmit={submit}>
          <div className="login-brand">
            <div className="brand-mark" style={{ width: 32, height: 32, fontSize: 13 }}>M</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>MYT</div>
            </div>
          </div>

          <h1>
            {mode === "loading"
              ? "Loading..."
              : isSetup
                ? "Create your admin account"
                : "Sign in to MYT"}
          </h1>
          {isSetup && (
            <div className="sub">No admin exists yet. This first account will be the workspace owner.</div>
          )}

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
            <div className="field-label">User ID</div>
            <input
              className="field-input"
              type="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="User ID"
              autoFocus={!isSetup}
              disabled={mode === "loading"}
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
              disabled={mode === "loading"}
            />
          </div>

          {err && (
            <div className="login-error" role="alert">{err}</div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={busy || mode === "loading"}
          >
            {busy ? "Working..." : isSetup ? "Create workspace" : "Sign in"}
          </button>
        </form>
      </div>

    </div>
  );
}
