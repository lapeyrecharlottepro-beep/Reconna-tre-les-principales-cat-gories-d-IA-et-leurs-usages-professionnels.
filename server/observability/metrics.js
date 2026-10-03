/**
 * Indicateurs d'usage en mémoire (remis à zéro au redémarrage).
 *
 * Aucune donnée personnelle : les identifiants de conversation sont
 * générés aléatoirement par le navigateur et seulement comptés.
 * Pour un suivi durable, remplacer ce module par un export vers une base
 * ou un outil d'analytics (même interface `record*`).
 */
const MAX_TRACKED_CONVERSATIONS = 10000;
const LATENCY_WINDOW = 200;

const state = {
  startedAt: new Date().toISOString(),
  conversations: new Set(),
  messages: 0,
  byLevel: {},
  byMode: {},
  ragSearches: 0,
  toolCalls: {},
  apiErrors: 0,
  injectionAttempts: 0,
  latencies: {},
};

function inc(obj, key, n = 1) { obj[key] = (obj[key] || 0) + n; }

function recordMessage({ conversationId, level, mode, latencyMs }) {
  if (conversationId && state.conversations.size < MAX_TRACKED_CONVERSATIONS) {
    state.conversations.add(conversationId);
  }
  state.messages += 1;
  inc(state.byLevel, level);
  inc(state.byMode, mode);
  const list = (state.latencies[level] = state.latencies[level] || []);
  list.push(latencyMs);
  if (list.length > LATENCY_WINDOW) list.shift();
}

function recordRagSearch() { state.ragSearches += 1; }
function recordToolCall(name) { inc(state.toolCalls, name); }
function recordApiError() { state.apiErrors += 1; }
function recordInjectionAttempt() { state.injectionAttempts += 1; }

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

function snapshot() {
  const responseTimeMs = {};
  for (const [level, values] of Object.entries(state.latencies)) {
    responseTimeMs[level] = {
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      p95: percentile(values, 95),
    };
  }
  return {
    startedAt: state.startedAt,
    conversations: state.conversations.size,
    messages: state.messages,
    byLevel: state.byLevel,
    byMode: state.byMode,
    ragSearches: state.ragSearches,
    toolCalls: state.toolCalls,
    apiErrors: state.apiErrors,
    injectionAttempts: state.injectionAttempts,
    responseTimeMs,
  };
}

module.exports = {
  recordMessage, recordRagSearch, recordToolCall, recordApiError, recordInjectionAttempt, snapshot,
};
