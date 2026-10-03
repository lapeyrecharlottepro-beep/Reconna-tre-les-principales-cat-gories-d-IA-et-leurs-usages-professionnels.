/**
 * RAG — étape 3 : embeddings (représentation numérique du sens d'un texte).
 * Les embeddings sont calculés une fois par `npm run ingest` (ou au démarrage)
 * et stockés dans data/vector-store.json : le serveur n'a ensuite qu'à
 * calculer l'embedding de la question.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const llm = require('../llm/client');

const ROOT = path.resolve(__dirname, '../..');
const BATCH_SIZE = 64;

/** Empreinte du contenu : permet de savoir si l'index est à jour. */
function fingerprint(chunks, model) {
  const hash = crypto.createHash('sha256').update(model);
  for (const c of chunks) hash.update(c.id).update(c.text);
  return hash.digest('hex');
}

async function embedTexts(texts) {
  const out = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    out.push(...await llm.createEmbeddings(texts.slice(i, i + BATCH_SIZE)));
  }
  return out;
}

async function buildVectorStore(chunks, { model, storePath }) {
  const vectors = await embedTexts(chunks.map((c) => c.text));
  const store = {
    model,
    createdAt: new Date().toISOString(),
    fingerprint: fingerprint(chunks, model),
    chunks: chunks.map((c, i) => ({ ...c, embedding: vectors[i] })),
  };
  const file = path.resolve(ROOT, storePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(store));
  return store;
}

function readVectorStore(storePath) {
  const file = path.resolve(ROOT, storePath);
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

module.exports = { buildVectorStore, readVectorStore, embedTexts, fingerprint };
