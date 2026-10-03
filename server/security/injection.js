/**
 * Détection simple des tentatives d'injection de prompt.
 *
 * Ce filtre ne suffit pas à lui seul (une IA peut être détournée par des
 * formulations imprévues) : il complète le prompt système, la séparation
 * stricte des documents et la vérification de la réponse (canari).
 */
const crypto = require('crypto');
const { normalize } = require('../utils/text');

const PATTERNS = [
  /ignor\w* (toutes |tous |les |l )*(tes |vos |ces |les )*(instruction|consigne|regle)/,
  /oubli\w* (toutes |tous |les )*(tes |vos |les )*(instruction|consigne|regle)/,
  /ignore (all |any )*(previous |prior |above )*instruction/,
  /(revele|montre|affiche|donne|repete|ecris|copie)\w* (moi )*(ton|tes|le|les|votre|vos) (prompt|instruction|consigne|regle)/,
  /(prompt|message) (systeme|system)/,
  /system prompt/,
  /(mode|role) (developpeur|developer|admin|dan|sans limite|sans restriction)/,
  /jailbreak/,
  /tu es (maintenant|desormais) (un|une)/,
  /a partir de maintenant tu/,
];

function detectInjection(text) {
  const n = normalize(text);
  return PATTERNS.some((p) => p.test(n));
}

// Jeton secret placé dans le prompt système : s'il apparaît dans une réponse,
// c'est que le prompt a fuité et la réponse est bloquée.
const CANARY = `LEAF-${crypto.randomBytes(6).toString('hex')}`;

function leaksSystemPrompt(output) {
  return typeof output === 'string' && output.includes(CANARY);
}

const REFUSAL = "Je ne peux pas partager mes instructions internes ni modifier mon rôle. "
  + "En revanche, je peux vous expliquer comment un chatbot comme moi est conçu, ou vous aider sur une question liée à VERTEO.";

module.exports = { detectInjection, leaksSystemPrompt, CANARY, REFUSAL };
