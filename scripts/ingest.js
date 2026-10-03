/**
 * npm run ingest — (re)construit l'index vectoriel de la base documentaire.
 * À relancer après l'ajout ou la modification d'un document dans /knowledge
 * (le serveur le fait aussi automatiquement au démarrage si l'index est périmé).
 */
const config = require('../config/chatbot');
const knowledgeBase = require('../server/rag/knowledgeBase');

(async () => {
  const stats = knowledgeBase.loadChunks();
  console.log(`Documents : ${stats.documents} — extraits : ${stats.chunks}`);
  if (!config.llm.apiKey && !config.llm.baseURL) {
    console.log("Ni OPENAI_API_KEY ni OPENAI_BASE_URL : l'index vectoriel n'est pas construit. La recherche lexicale reste disponible.");
    return;
  }
  const store = await knowledgeBase.buildIndex();
  console.log(`Index vectoriel écrit dans ${config.rag.vectorStorePath} (${store.chunks.length} extraits, modèle ${store.model}).`);
})().catch((err) => {
  console.error('Échec de l\'ingestion :', err.message);
  process.exit(1);
});
