/** Niveau 3 — RAG : recherche documentaire systématique avant chaque réponse. */
const { answerWithRag } = require('../rag/generator');

async function run({ systemPrompt, history, message, extraSystem }) {
  const result = await answerWithRag({ systemPrompt, history, message, extraSystem });
  return {
    response: result.response,
    sources: result.sources,
    toolCalls: [],
    meta: { retrieval: result.retrieval },
  };
}

module.exports = { run };
