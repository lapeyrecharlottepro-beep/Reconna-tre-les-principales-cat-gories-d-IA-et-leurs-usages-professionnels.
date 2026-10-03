/**
 * Gestion du contexte de conversation.
 *
 * Version actuelle : l'historique est conservé côté navigateur et renvoyé à
 * chaque requête ; le serveur le valide puis le tronque (contrôle des coûts).
 *
 * Évolutions prévues (même interface) :
 *  - mémoire de session côté serveur (Map, Redis…) ;
 *  - mémoire utilisateur (préférences, niveau de l'apprenant) ;
 *  - historique persistant en base de données.
 */
const config = require('../../config/chatbot');

/** Ne conserve que les N derniers messages et tronque les messages trop longs. */
function trimHistory(conversation, {
  maxMessages = config.conversation.maxHistoryMessages,
  maxItemLength = config.conversation.maxHistoryItemLength,
} = {}) {
  const recent = conversation.slice(-maxMessages);
  // L'historique envoyé au modèle doit commencer par un message utilisateur.
  while (recent.length && recent[0].role !== 'user') recent.shift();
  return recent.map((m) => ({
    role: m.role,
    content: m.content.length > maxItemLength ? `${m.content.slice(0, maxItemLength)}…` : m.content,
  }));
}

/**
 * Interface de stockage de session (non utilisée en V1).
 * Une implémentation persistante devra exposer les mêmes méthodes.
 */
class InMemorySessionStore {
  constructor() { this.sessions = new Map(); }
  async get(id) { return this.sessions.get(id) || []; }
  async append(id, message) { this.sessions.set(id, [...(await this.get(id)), message]); }
  async clear(id) { this.sessions.delete(id); }
}

module.exports = { trimHistory, InMemorySessionStore };
