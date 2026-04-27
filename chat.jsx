// MYT — AI Chat assistant (admin only). Wired to window.claude.complete.

function buildContextSummary(state) {
  const today = window.MYT.todayISO();
  const userMap = Object.fromEntries(state.users.map(u => [u.id, u]));
  const projectMap = Object.fromEntries(state.projects.map(p => [p.id, p]));

  const tasks = state.tasks.map(t => {
    const a = userMap[t.assigneeId];
    const p = projectMap[t.projectId];
    return {
      id: t.id,
      title: t.title,
      assignee: a?.name || "Unassigned",
      project: p?.name || "—",
      priority: t.priority,
      status: t.status,
      startDate: t.startDate,
      dueDate: t.dueDate,
      tags: t.tags || [],
      commentCount: (t.comments || []).length,
      lastComment: (t.comments || []).slice(-1)[0]?.text || null,
      description: t.description
    };
  });

  return { today, tasks, users: state.users.map(u => ({ name: u.name, email: u.email, role: u.role, title: u.title })) };
}

function ChatAssistant({ state, onOpenTask, onClose }) {
  const [messages, setMessages] = React.useState([
    {
      role: "assistant",
      text: "Hi Mohan — I'm your task assistant. Ask me anything about workload, due dates, comments, or specific tasks. I see everything in your workspace."
    }
  ]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const bodyRef = React.useRef(null);

  React.useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, loading]);

  const suggestions = [
    "Who is working on the BOM tasks?",
    "What's due tomorrow with no comments yet?",
    "Show overdue tasks by priority",
    "Who has the heaviest workload?"
  ];

  const send = async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;
    setInput("");

    const newMessages = [...messages, { role: "user", text }];
    setMessages(newMessages);
    setLoading(true);

    const ctx = buildContextSummary(state);
    const systemPreface = `You are the in-app assistant for MYT, a task management tool. Today is ${ctx.today}.

You have full read access to the workspace data below (JSON). Answer the user's question concisely and helpfully. Use plain prose with short bullet lists when listing tasks. When you reference a task, format it inline as [task:TASK_ID] using the exact id (e.g. [task:t-001]). Keep answers under 6 sentences unless a list is needed. Be specific — name names, dates, and counts. Do not invent data.

Workspace data:
${JSON.stringify(ctx).slice(0, 12000)}

User question: ${text}`;

    try {
      const reply = await window.claude.complete(systemPreface);
      setMessages([...newMessages, { role: "assistant", text: reply || "I couldn't generate a response. Try rephrasing." }]);
    } catch (e) {
      setMessages([...newMessages, { role: "assistant", text: "Sorry, I hit an error reaching the assistant. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const renderBubble = (text) => {
    // turn [task:t-xxx] into clickable refs
    const parts = [];
    const re = /\[task:([a-z0-9-]+)\]/gi;
    let last = 0, m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) parts.push(text.slice(last, m.index));
      const id = m[1];
      const t = state.tasks.find(x => x.id === id);
      parts.push(
        <span key={parts.length} className="chat-task-ref" onClick={() => t && onOpenTask(t.id)}>
          {t ? t.title : id}
        </span>
      );
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));

    // render newlines + simple bullets
    const lines = [];
    parts.forEach((p, i) => {
      if (typeof p !== "string") { lines.push(p); return; }
      const split = p.split("\n");
      split.forEach((s, j) => {
        if (j > 0) lines.push(<br key={`br-${i}-${j}`} />);
        lines.push(s);
      });
    });
    return lines;
  };

  return (
    <div className="chat-panel" role="dialog" aria-label="Task assistant">
      <div className="chat-head">
        <div className="chat-head-avatar"><Icon name="sparkle" size={16} /></div>
        <div className="chat-head-meta">
          <div className="chat-head-title">Task assistant</div>
          <div className="chat-head-status">Connected · live workspace</div>
        </div>
        <button className="icon-btn" onClick={onClose}><Icon name="close" /></button>
      </div>

      <div className="chat-body" ref={bodyRef}>
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            {m.role === "assistant" && <div className="chat-bot-avatar"><Icon name="sparkle" size={12} /></div>}
            <div className="chat-bubble">{renderBubble(m.text)}</div>
            {m.role === "user" && <div className="chat-bot-avatar" style={{ background: "var(--text-secondary)" }}>M</div>}
          </div>
        ))}

        {loading && (
          <div className="chat-msg">
            <div className="chat-bot-avatar"><Icon name="sparkle" size={12} /></div>
            <div className="chat-bubble">
              <div className="chat-typing"><span></span><span></span><span></span></div>
            </div>
          </div>
        )}

        {messages.length === 1 && !loading && (
          <div className="chat-suggestions">
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 4 }}>
              Try asking
            </div>
            {suggestions.map(s => (
              <button key={s} className="chat-suggestion" onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        )}
      </div>

      <div className="chat-input-wrap">
        <div className="chat-input-row">
          <textarea
            placeholder="Ask about tasks, workload, due dates…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
          />
          <button className="chat-send" onClick={() => send()} disabled={!input.trim() || loading}>
            <Icon name="send" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

window.ChatAssistant = ChatAssistant;
