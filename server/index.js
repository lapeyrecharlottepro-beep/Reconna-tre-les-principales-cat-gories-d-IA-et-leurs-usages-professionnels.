/**
 * Démarrage du serveur Leaf.
 */
const config = require('../config/chatbot');
const logger = require('./observability/logger');
const llm = require('./llm/client');
const knowledgeBase = require('./rag/knowledgeBase');
const { createApp } = require('./app');

const kb = knowledgeBase.loadChunks();
knowledgeBase.ensureIndexInBackground();

createApp().listen(config.server.port, () => {
  logger.info('server_started', {
    port: config.server.port,
    llmConfigured: llm.isConfigured(),
    model: config.llm.model,
    knowledge: kb,
  });
  console.log(`\n  Leaf est disponible sur http://localhost:${config.server.port}\n`);
  if (!llm.isConfigured()) {
    console.log('  ⚠ Aucun modèle configuré (OPENAI_API_KEY ou OPENAI_BASE_URL) : seul le niveau 1 (NLP) est utilisable. Voir .env.example\n');
  }
});
