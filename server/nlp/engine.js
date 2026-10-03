/**
 * Niveau 1 — Moteur NLP (sans modèle de langage).
 *
 * Étapes, faciles à montrer en formation :
 *  1. normalisation et découpage de la phrase (minuscules, accents, mots vides) ;
 *  2. détection d'entités (collaborateurs, produits) par dictionnaire ;
 *  3. classification d'intention : similarité avec les phrases d'exemple
 *     + bonus de mots-clés ;
 *  4. réponse prédéfinie de l'intention retenue, ou réponse de repli.
 */
const config = require('../../config/chatbot');
const { tokenize, normalize } = require('../utils/text');
const { intents, FALLBACK } = require('./intents');
const { employees } = require('../../data/employees.json');
const { products } = require('../../data/products.json');
const { detectInjection, REFUSAL } = require('../security/injection');

const prepared = intents.map((intent) => ({
  ...intent,
  exampleTokens: intent.examples.map((e) => new Set(tokenize(e))),
}));

function similarity(a, b) {
  if (!a.size || !b.size) return 0;
  let common = 0;
  a.forEach((t) => { if (b.has(t)) common += 1; });
  return common / Math.sqrt(a.size * b.size); // similarité cosinus sur ensembles
}

function detectEntities(text) {
  const n = ` ${normalize(text)} `;
  const employee = employees.find((e) => n.includes(` ${normalize(e.firstName)} `));
  const product = products.find((p) => n.includes(normalize(p.name)) || n.includes(` ${p.id.replace(/-/g, ' ')} `));
  return { employee, product };
}

function classify(text) {
  const tokens = new Set(tokenize(text));
  const normalized = normalize(text);
  const scores = prepared.map((intent) => {
    const best = Math.max(...intent.exampleTokens.map((ex) => similarity(tokens, ex)));
    const keywordHits = intent.keywords.filter((k) => normalized.includes(k)).length;
    return { intent, score: Math.min(1, best + 0.15 * keywordHits) };
  }).sort((a, b) => b.score - a.score);
  return scores;
}

/**
 * @returns {{ response: string, intent: {id,label,confidence}|null, entities: object, alternatives: object[] }}
 */
function respond(text) {
  if (detectInjection(text)) {
    return { response: REFUSAL, intent: { id: 'tentative_injection', label: 'Tentative de détournement', confidence: 1 }, entities: {}, alternatives: [] };
  }
  const entities = detectEntities(text);
  const scores = classify(text);
  let [top] = scores;

  // Une entité « collaborateur » oriente vers l'intention dédiée si rien de mieux n'est trouvé.
  if (entities.employee && (top.score < 0.6 || top.intent.id === 'organigramme')) {
    top = { intent: prepared.find((i) => i.id === 'qui_est'), score: Math.max(top.score, 0.6) };
  }
  if (entities.product && top.score < 0.6) {
    top = { intent: prepared.find((i) => i.id === 'produits'), score: Math.max(top.score, 0.6) };
  }

  const entityView = {
    ...(entities.employee && { collaborateur: entities.employee.firstName }),
    ...(entities.product && { produit: entities.product.name }),
  };
  const alternatives = scores.slice(0, 3).map((s) => ({ id: s.intent.id, confidence: Number(s.score.toFixed(2)) }));

  if (top.score < config.nlp.minConfidence) {
    return { response: FALLBACK, intent: null, entities: entityView, alternatives };
  }
  return {
    response: top.intent.response(entities),
    intent: { id: top.intent.id, label: top.intent.label, confidence: Number(top.score.toFixed(2)) },
    entities: entityView,
    alternatives,
  };
}

module.exports = { respond, classify, detectEntities };
