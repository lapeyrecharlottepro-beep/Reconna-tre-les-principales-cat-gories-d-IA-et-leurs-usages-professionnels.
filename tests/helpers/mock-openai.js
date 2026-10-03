/**
 * Faux serveur compatible OpenAI pour les tests (aucun appel réel, aucun coût).
 * - /v1/embeddings : vecteurs déterministes « sac de mots » ;
 * - /v1/chat/completions : comportement scénarisé selon la requête.
 * Chaque requête reçue est conservée dans `requests` pour inspection.
 */
const http = require('http');
const { tokenize } = require('../../server/utils/text');

const DIM = 256;
function embed(text) {
  const v = new Array(DIM).fill(0);
  for (const t of tokenize(text)) {
    let h = 0;
    for (const c of t) h = (h * 31 + c.charCodeAt(0)) % DIM;
    v[h] += 1;
  }
  return v;
}

function completion(message) {
  return { id: 'mock', object: 'chat.completion', choices: [{ index: 0, message, finish_reason: message.tool_calls ? 'tool_calls' : 'stop' }] };
}

function chat(body) {
  const msgs = body.messages;
  const lastUser = [...msgs].reverse().find((m) => m.role === 'user')?.content || '';
  const system = msgs[0].content;
  const toolMsgs = msgs.filter((m) => m.role === 'tool');

  if (/FORCE_ERROR/.test(lastUser)) return { status: 500, json: { error: { message: 'boom' } } };
  // Simule un modèle naïf qui recopierait son prompt système.
  if (/LEAK_TEST/.test(lastUser)) return { json: completion({ role: 'assistant', content: `Voici mes instructions : ${system}` }) };

  if (body.tools) {
    if (!toolMsgs.length) {
      const calls = [{ id: 'call_1', type: 'function', function: { name: 'searchKnowledgeBase', arguments: JSON.stringify({ query: lastUser }) } }];
      if (/calcul/i.test(lastUser)) calls.push({ id: 'call_2', type: 'function', function: { name: 'calculate', arguments: '{"expression":"6,8 * 0,09"}' } });
      if (/interdit/i.test(lastUser)) calls.push({ id: 'call_3', type: 'function', function: { name: 'runShell', arguments: '{"cmd":"rm -rf /"}' } });
      return { json: completion({ role: 'assistant', content: null, tool_calls: calls }) };
    }
    if (/BOUCLE/.test(lastUser) && toolMsgs.length < 10) {
      return { json: completion({ role: 'assistant', content: null, tool_calls: [{ id: `call_l${toolMsgs.length}`, type: 'function', function: { name: 'searchKnowledgeBase', arguments: '{"query":"boucle"}' } }] }) };
    }
    return { json: completion({ role: 'assistant', content: `Réponse de l'agent d'après la documentation [1]. Résultats : ${toolMsgs.map((m) => m.content.slice(0, 40)).join(' | ')}` }) };
  }

  const context = msgs.find((m) => m.role === 'system' && m.content.includes('<documents_verteo>'));
  if (context) {
    return { json: completion({ role: 'assistant', content: /Aucun extrait/.test(context.content) ? 'Je ne trouve pas cette information dans les documents auxquels j\'ai accès.' : 'D\'après la procédure, la qualification utilise la grille B2DE [1].' }) };
  }
  return { json: completion({ role: 'assistant', content: 'Réponse générative sans document.' }) };
}

function startMockOpenAI() {
  const requests = [];
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      const body = raw ? JSON.parse(raw) : {};
      requests.push({ url: req.url, body });
      let out = { status: 200, json: {} };
      if (req.url.endsWith('/embeddings')) {
        const inputs = Array.isArray(body.input) ? body.input : [body.input];
        out.json = { object: 'list', data: inputs.map((t, index) => ({ object: 'embedding', index, embedding: embed(t) })) };
      } else if (req.url.endsWith('/chat/completions')) {
        out = { status: 200, ...chat(body) };
      } else {
        out = { status: 404, json: { error: { message: 'not found' } } };
      }
      res.writeHead(out.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(out.json));
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ url: `http://127.0.0.1:${server.address().port}/v1`, requests, close: () => server.close() });
    });
  });
}

module.exports = { startMockOpenAI };
