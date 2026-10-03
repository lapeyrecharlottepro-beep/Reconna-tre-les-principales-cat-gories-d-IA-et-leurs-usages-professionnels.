/**
 * RAG — étape 6 : génération de la réponse.
 * 1. rechercher les extraits ; 2. les injecter dans le contexte ;
 * 3. demander au modèle de répondre en citant ses sources.
 */
const llm = require('../llm/client');
const { retrieve } = require('./knowledgeBase');
const { SourceRegistry, formatContext } = require('./context');

async function answerWithRag({ systemPrompt, history, message, extraSystem = [] }) {
  const { method, results } = await retrieve(message);
  const registry = new SourceRegistry();
  const context = formatContext(results, registry);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'system', content: context },
    ...extraSystem.map((content) => ({ role: 'system', content })),
    { role: 'user', content: message },
  ];
  const completion = await llm.createChatCompletion({ messages });
  const response = completion.choices[0]?.message?.content || '';

  return {
    response,
    sources: registry.cited(response),
    retrieval: {
      method,
      results: results.map(({ chunk, score }) => ({
        source: registry.number(chunk), title: chunk.title, section: chunk.section, score: Number(score.toFixed(3)),
      })),
    },
  };
}

module.exports = { answerWithRag };
