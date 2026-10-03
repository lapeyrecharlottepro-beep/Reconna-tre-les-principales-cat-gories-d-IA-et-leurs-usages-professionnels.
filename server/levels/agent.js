/**
 * Niveau 4 — Agent conversationnel.
 *
 * Boucle « raisonner → agir → observer » :
 *  1. le modèle reçoit la question et la liste des outils autorisés ;
 *  2. s'il demande un outil, le serveur l'exécute (le modèle n'exécute rien lui-même) ;
 *  3. le résultat est renvoyé au modèle, qui peut appeler un autre outil ou répondre.
 * Le nombre d'itérations est plafonné (config.agent.maxIterations).
 */
const config = require('../../config/chatbot');
const llm = require('../llm/client');
const metrics = require('../observability/metrics');
const { toolDefinitions, executeTool, serializeResult } = require('../tools/registry');
const { SourceRegistry } = require('../rag/context');

function summarize(name, outcome) {
  if (!outcome.ok) return `Erreur : ${outcome.error}`;
  const r = outcome.result || {};
  if (name === 'searchKnowledgeBase') return `${(r.results || []).length} extrait(s) trouvé(s)`;
  if (name === 'calculate') return `= ${r.result}`;
  if (r.found === false) return 'Aucun résultat';
  if (Array.isArray(r.employees)) return `${r.employees.length} collaborateur(s)`;
  if (Array.isArray(r.products)) return `${r.products.length} produit(s)`;
  if (Array.isArray(r.catalogue)) return `${r.catalogue.length} élément(s) du catalogue`;
  return 'Données obtenues';
}

async function run({ systemPrompt, history, message, extraSystem }) {
  const context = { sources: new SourceRegistry(), retrievalMethod: null };
  const tools = toolDefinitions();
  const toolCalls = [];
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    ...extraSystem.map((content) => ({ role: 'system', content })),
    { role: 'user', content: message },
  ];

  let response = null;
  for (let i = 0; i < config.agent.maxIterations && response === null; i += 1) {
    const completion = await llm.createChatCompletion({ messages, tools });
    const reply = completion.choices[0]?.message || {};
    const calls = reply.tool_calls || [];

    if (!calls.length) { response = reply.content || ''; break; }

    messages.push({ role: 'assistant', content: reply.content || null, tool_calls: calls });
    for (const call of calls) {
      const started = Date.now();
      const name = call.function?.name;
      const outcome = await executeTool(name, call.function?.arguments, context);
      metrics.recordToolCall(outcome.ok ? name : `${name}:erreur`);
      toolCalls.push({
        name,
        arguments: outcome.args || null,
        ok: outcome.ok,
        summary: summarize(name, outcome),
        durationMs: Date.now() - started,
      });
      messages.push({ role: 'tool', tool_call_id: call.id, content: serializeResult(outcome) });
    }
  }

  // Plafond atteint : on demande une réponse finale sans nouvel outil.
  if (response === null) {
    messages.push({ role: 'system', content: 'Nombre maximal d\'outils atteint : réponds maintenant avec les informations obtenues.' });
    const completion = await llm.createChatCompletion({ messages });
    response = completion.choices[0]?.message?.content || '';
  }

  return {
    response,
    sources: context.sources.cited(response),
    toolCalls,
    meta: { retrieval: context.retrievalMethod ? { method: context.retrievalMethod } : null },
  };
}

module.exports = { run };
