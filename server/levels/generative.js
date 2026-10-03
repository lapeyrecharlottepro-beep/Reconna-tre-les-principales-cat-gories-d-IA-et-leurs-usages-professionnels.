/** Niveau 2 — IA générative : le modèle rédige librement, sans accès aux documents. */
const llm = require('../llm/client');

async function run({ systemPrompt, history, message, extraSystem }) {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    ...extraSystem.map((content) => ({ role: 'system', content })),
    { role: 'user', content: message },
  ];
  const completion = await llm.createChatCompletion({ messages });
  return {
    response: completion.choices[0]?.message?.content || '',
    sources: [],
    toolCalls: [],
    meta: {},
  };
}

module.exports = { run };
