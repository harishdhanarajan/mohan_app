function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o";
  if (!apiKey) {
    sendJson(res, 500, { error: "OPENAI_API_KEY is not configured on the server." });
    return;
  }

  try {
    const { prompt } = req.body || {};
    if (typeof prompt !== "string" || !prompt.trim()) {
      sendJson(res, 400, { error: "Missing prompt." });
      return;
    }

    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "You are the MYT task assistant. Use only the workspace context provided by the user prompt. If the workspace has no matching data, say so plainly."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 700
      })
    });

    const data = await openAIResponse.json().catch(() => ({}));
    if (!openAIResponse.ok) {
      sendJson(res, openAIResponse.status, { error: data.error?.message || "OpenAI request failed." });
      return;
    }

    sendJson(res, 200, { reply: data.choices?.[0]?.message?.content?.trim() || "" });
  } catch (error) {
    console.error("[openai-chat]", error);
    sendJson(res, 500, { error: error.message || "Chat request failed." });
  }
}
