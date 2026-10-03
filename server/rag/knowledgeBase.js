/**
 * Point d'entrée de la base de connaissances VERTEO.
 * Charge et découpe les documents, choisit la méthode de recherche
 * (vectorielle si un index à jour existe, lexicale sinon) et expose
 * `retrieve(question)`.
 */
const config = require('../../config/chatbot');
const llm = require('../llm/client');
const logger = require('../observability/logger');
const metrics = require('../observability/metrics');
const { loadDocuments } = require('./loader');
const { chunkDocument } = require('./chunker');
const { buildVectorStore, readVectorStore, embedTexts, fingerprint } = require('./embeddings');
const { vectorSearch, LexicalIndex } = require('./search');

const state = { chunks: [], documents: [], lexical: null, vectors: null, building: null };

function loadChunks() {
  state.documents = loadDocuments(config.rag.knowledgeDir);
  state.chunks = state.documents.flatMap((d) => chunkDocument(d, config.rag));
  state.lexical = new LexicalIndex(state.chunks);

  const store = readVectorStore(config.rag.vectorStorePath);
  const expected = fingerprint(state.chunks, config.rag.embeddingModel);
  state.vectors = store && store.fingerprint === expected ? store.chunks : null;
  return { documents: state.documents.length, chunks: state.chunks.length, vectorIndex: Boolean(state.vectors) };
}

/** (Re)construit l'index vectoriel si une clé API est disponible. */
async function buildIndex() {
  if (!llm.isConfigured()) throw new Error('OPENAI_API_KEY manquante : index vectoriel impossible.');
  const store = await buildVectorStore(state.chunks, {
    model: config.rag.embeddingModel, storePath: config.rag.vectorStorePath,
  });
  state.vectors = store.chunks;
  return store;
}

/** Au démarrage : construit l'index en arrière-plan s'il est absent ou périmé. */
function ensureIndexInBackground() {
  if (state.vectors || !llm.isConfigured() || state.building) return;
  state.building = buildIndex()
    .then((s) => logger.info('rag_index_built', { chunks: s.chunks.length, model: s.model }))
    .catch((err) => logger.warn('rag_index_failed', { reason: err.message }))
    .finally(() => { state.building = null; });
}

/**
 * Recherche les extraits les plus pertinents pour une question.
 * @returns {Promise<{ method: 'embeddings'|'lexical', results: {chunk, score}[] }>}
 */
async function retrieve(query, { topK = config.rag.topK } = {}) {
  if (!state.lexical) loadChunks();
  metrics.recordRagSearch();

  if (state.vectors && llm.isConfigured()) {
    try {
      const [queryVector] = await embedTexts([query]);
      return {
        method: 'embeddings',
        results: vectorSearch(queryVector, state.vectors, { topK, minScore: config.rag.minScoreVector }),
      };
    } catch (err) {
      logger.warn('rag_embedding_fallback', { reason: err.message });
    }
  }
  return { method: 'lexical', results: state.lexical.search(query, { topK, minScore: config.rag.minScoreLexical }) };
}

function stats() {
  if (!state.lexical) loadChunks();
  return { documents: state.documents.length, chunks: state.chunks.length, vectorIndex: Boolean(state.vectors) };
}

module.exports = { loadChunks, buildIndex, ensureIndexInBackground, retrieve, stats };
