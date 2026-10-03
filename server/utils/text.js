/**
 * Outils de traitement de texte partagés (NLP niveau 1 et recherche lexicale).
 * Volontairement simples pour pouvoir être expliqués en formation.
 */

// Mots trop fréquents pour aider à distinguer un sens (« mots vides »).
const STOPWORDS = new Set(`
a au aux avec ce ces cet cette dans de des du elle en et eux il ils je la le les leur leurs lui ma mais me meme mes moi mon ne nos notre nous on ou par pas pour qu que qui sa se ses son sur ta te tes toi ton tu un une vos votre vous c d j l m n s t y
est sont suis es etre ete etait avoir ai as avons avez ont fait faire peux peut pouvez pourrais pourriez veux voudrais souhaite souhaiterais
quel quelle quels quelles comment quoi ou combien est-ce estce
moi svp stp bien tres plus moins tout tous toute toutes chez
verteo leaf
`.split(/\s+/).filter(Boolean));

/** Minuscules, suppression des accents et de la ponctuation. */
function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9+%\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Racinisation très légère du français (pluriels et quelques suffixes). */
function stem(word) {
  let w = word;
  if (w.length > 6) w = w.replace(/(ements|ement|ations|ation|ements|ites|ite|euses|euse|eurs|eur|ives|ive)$/, '');
  if (w.length > 4) w = w.replace(/(aux)$/, 'al').replace(/[sx]$/, '');
  if (w.length > 5) w = w.replace(/e$/, '');
  return w;
}

/** Découpe un texte en racines significatives (sans mots vides). */
function tokenize(text, { keepStopwords = false } = {}) {
  return normalize(text)
    .split(/[\s-]+/)
    .filter((t) => t.length > 1 && (keepStopwords || !STOPWORDS.has(t)))
    .map(stem);
}

module.exports = { normalize, tokenize, stem, STOPWORDS };
