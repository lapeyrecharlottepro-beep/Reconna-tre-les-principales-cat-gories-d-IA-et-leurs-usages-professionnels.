/**
 * Validation des entrées de POST /api/chat.
 * On n'accepte que ce qui est attendu : tout le reste est rejeté.
 */
const config = require('../../config/chatbot');

class ValidationError extends Error {
  constructor(message) { super(message); this.status = 400; this.expose = true; }
}

const ALLOWED_ROLES = new Set(['user', 'assistant']); // jamais « system » depuis le client

function cleanText(value) {
  // Suppression des caractères de contrôle (hors retours à la ligne et tabulations)
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
}

function validateChatRequest(body) {
  if (!body || typeof body !== 'object') throw new ValidationError('Requête invalide.');

  const { message, conversation = [], mode, level, conversationId } = body;

  if (typeof message !== 'string' || !cleanText(message)) {
    throw new ValidationError('Le message est vide.');
  }
  const text = cleanText(message);
  if (text.length > config.conversation.maxMessageLength) {
    throw new ValidationError(`Le message dépasse ${config.conversation.maxMessageLength} caractères.`);
  }

  if (!Array.isArray(conversation) || conversation.length > 200) {
    throw new ValidationError("L'historique de conversation est invalide.");
  }
  const history = conversation.map((item) => {
    if (!item || typeof item !== 'object' || !ALLOWED_ROLES.has(item.role) || typeof item.content !== 'string') {
      throw new ValidationError("L'historique de conversation est invalide.");
    }
    return { role: item.role, content: cleanText(item.content) };
  }).filter((item) => item.content);

  const finalMode = mode === undefined ? config.modes.default : mode;
  if (!config.modes.available.includes(finalMode)) throw new ValidationError('Mode inconnu.');

  const finalLevel = level === undefined ? config.levels.default : level;
  if (!Object.hasOwn(config.levels.available, finalLevel)) throw new ValidationError('Niveau inconnu.');

  let id = null;
  if (conversationId !== undefined) {
    if (typeof conversationId !== 'string' || !/^[a-zA-Z0-9-]{8,64}$/.test(conversationId)) {
      throw new ValidationError('Identifiant de conversation invalide.');
    }
    id = conversationId;
  }

  return { message: text, conversation: history, mode: finalMode, level: finalLevel, conversationId: id };
}

module.exports = { validateChatRequest, ValidationError };
