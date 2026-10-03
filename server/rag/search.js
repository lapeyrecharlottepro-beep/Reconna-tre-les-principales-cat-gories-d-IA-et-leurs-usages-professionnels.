/**
 * RAG — étape 4 : recherche des extraits pertinents.
 * Deux méthodes :
 *  - vectorielle (sens) : similarité cosinus entre embeddings ;
 *  - lexicale (mots) : score BM25, utilisée en secours sans clé API ou sans index.
 */
const { tokenize } = require('../utils/text');

function cosine(a, b) {
  let dot = 0; let na = 0; let nb = 0;
  for (let i = 0; i < a.length; i += 1) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

function vectorSearch(queryVector, chunks, { topK, minScore }) {
  return chunks
    .map((c) => ({ chunk: c, score: cosine(queryVector, c.embedding) }))
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/** Index lexical BM25, construit une fois à partir des extraits. */
class LexicalIndex {
  constructor(chunks, { k1 = 1.4, b = 0.75 } = {}) {
    this.k1 = k1; this.b = b;
    this.docs = chunks.map((c) => {
      const tokens = tokenize(c.text);
      const tf = new Map();
      tokens.forEach((t) => tf.set(t, (tf.get(t) || 0) + 1));
      return { chunk: c, tf, length: tokens.length };
    });
    this.avgLength = this.docs.reduce((s, d) => s + d.length, 0) / (this.docs.length || 1);
    this.df = new Map();
    this.docs.forEach((d) => d.tf.forEach((_, t) => this.df.set(t, (this.df.get(t) || 0) + 1)));
  }

  idf(term) {
    const n = this.docs.length; const df = this.df.get(term) || 0;
    return Math.log(1 + (n - df + 0.5) / (df + 0.5));
  }

  search(query, { topK, minScore }) {
    const terms = [...new Set(tokenize(query))];
    if (!terms.length) return [];
    // Référence de normalisation : les 4 mots les plus informatifs de la question
    // (une longue question n'est pas pénalisée par ses mots secondaires).
    const maxIdf = terms.map((t) => this.idf(t)).sort((a, b) => b - a).slice(0, 4).reduce((s, v) => s + v, 0);
    return this.docs.map((d) => {
      let score = 0; let matchedIdf = 0;
      for (const t of terms) {
        const f = d.tf.get(t);
        if (!f) continue;
        const idf = this.idf(t);
        matchedIdf += idf;
        score += idf * ((f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + this.b * (d.length / this.avgLength))));
      }
      // Score normalisé (0 à 1) : part « pondérée » des mots de la question retrouvés.
      return { chunk: d.chunk, score: maxIdf ? Math.min(1, matchedIdf / maxIdf) : 0, rank: score };
    })
      .filter((r) => r.score >= minScore && r.rank > 0)
      .sort((a, b) => b.rank - a.rank)
      // On écarte les résultats nettement moins pertinents que le meilleur.
      .filter((r, _, all) => r.score >= all[0].score * 0.5)
      .slice(0, topK);
  }
}

module.exports = { cosine, vectorSearch, LexicalIndex };
