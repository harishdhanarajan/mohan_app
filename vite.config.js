import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Request body too large.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (_error) {
        reject(new Error('Invalid JSON body.'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function openAIChatPlugin(env) {
  const apiKey = env.OPENAI_API_KEY;
  const model = env.OPENAI_MODEL || 'gpt-4o';

  return {
    name: 'myt-openai-chat-api',
    configureServer(server) {
      server.middlewares.use('/api/chat', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed.' });
          return;
        }

        if (!apiKey) {
          sendJson(res, 500, { error: 'OPENAI_API_KEY is not configured on the server.' });
          return;
        }

        try {
          const { prompt } = await readJson(req);
          if (typeof prompt !== 'string' || !prompt.trim()) {
            sendJson(res, 400, { error: 'Missing prompt.' });
            return;
          }

          const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: 'system',
                  content: 'You are the MYT task assistant. Use only the workspace context provided by the user prompt. If the workspace has no matching data, say so plainly.'
                },
                { role: 'user', content: prompt }
              ],
              temperature: 0.2,
              max_tokens: 700
            })
          });

          const data = await openAIResponse.json().catch(() => ({}));
          if (!openAIResponse.ok) {
            sendJson(res, openAIResponse.status, { error: data.error?.message || 'OpenAI request failed.' });
            return;
          }

          sendJson(res, 200, { reply: data.choices?.[0]?.message?.content?.trim() || '' });
        } catch (error) {
          console.error('[openai-chat]', error);
          sendJson(res, 500, { error: error.message || 'Chat request failed.' });
        }
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), openAIChatPlugin(env)],
    server: { port: 5173, open: true }
  };
});
