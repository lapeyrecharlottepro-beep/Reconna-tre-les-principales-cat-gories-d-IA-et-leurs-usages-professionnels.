/**
 * Journalisation structurée (une ligne JSON par événement).
 *
 * Règle : on ne journalise JAMAIS le contenu des messages, la clé API ni
 * aucune donnée personnelle. Uniquement des métadonnées techniques
 * (niveau, durée, longueur du message, outils utilisés…).
 */
const SILENT = process.env.NODE_ENV === 'test';

function write(severity, event, data = {}) {
  if (SILENT) return;
  const line = JSON.stringify({ time: new Date().toISOString(), severity, event, ...data });
  if (severity === 'error') console.error(line); else console.log(line);
}

module.exports = {
  info: (event, data) => write('info', event, data),
  warn: (event, data) => write('warn', event, data),
  error: (event, data) => write('error', event, data),
};
