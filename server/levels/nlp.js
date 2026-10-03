/** Niveau 1 — Chatbot NLP : intention + réponse prédéfinie, sans modèle de langage. */
const nlp = require('../nlp/engine');

async function run({ message }) {
  const result = nlp.respond(message);
  return {
    response: result.response,
    sources: [],
    toolCalls: [],
    meta: { intent: result.intent, entities: result.entities, alternatives: result.alternatives },
  };
}

module.exports = { run };
