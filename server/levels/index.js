/**
 * Orchestrateur : reçoit une demande validée et la confie au bon niveau.
 */
const config = require('../../config/chatbot');
const llm = require('../llm/client');
const metrics = require('../observability/metrics');
const logger = require('../observability/logger');
const { trimHistory } = require('../memory/conversation');
const { buildSystemPrompt, INJECTION_REMINDER } = require('../prompts/leaf-system');
const { detectInjection, leaksSystemPrompt, REFUSAL } = require('../security/injection');

const LEVELS = {
  nlp: require('./nlp'),
  generative: require('./generative'),
  rag: require('./rag'),
  agent: require('./agent'),
};

class ChatError extends Error {
  constructor(message, status) { super(message); this.status = status; this.expose = true; }
}

async function handleChat({ message, conversation, mode, level, conversationId }) {
  const started = Date.now();
  const levelConfig = config.levels.available[level];

  if (levelConfig.usesLLM && !llm.isConfigured()) {
    throw new ChatError("Ce niveau utilise l'API OpenAI, mais la clé n'est pas configurée sur le serveur. Le niveau 1 (NLP) reste disponible.", 503);
  }

  const injection = detectInjection(message);
  if (injection) metrics.recordInjectionAttempt();

  let result;
  try {
    result = await LEVELS[level].run({
      message,
      history: trimHistory(conversation),
      systemPrompt: levelConfig.usesLLM ? buildSystemPrompt({ level, mode }) : null,
      extraSystem: injection ? [INJECTION_REMINDER] : [],
    });
  } catch (err) {
    if (err instanceof ChatError) throw err;
    metrics.recordApiError();
    logger.error('chat_failed', { level, status: err.status || null, type: err.name, code: err.code || null });
    throw new ChatError('Leaf rencontre une difficulté pour répondre. Réessayez dans un instant.', 502);
  }

  // Dernier rempart : la réponse ne doit jamais contenir le prompt système.
  if (leaksSystemPrompt(result.response)) {
    logger.warn('system_prompt_leak_blocked', { level });
    result = { ...result, response: REFUSAL, sources: [] };
  }
  if (!result.response.trim()) result.response = "Je n'ai pas pu formuler de réponse. Pouvez-vous reformuler votre question ?";

  const latencyMs = Date.now() - started;
  metrics.recordMessage({ conversationId, level, mode, latencyMs });
  logger.info('chat', {
    level, mode, messageLength: message.length, historyLength: conversation.length, latencyMs,
    tools: result.toolCalls.map((t) => t.name), sources: result.sources.length, injectionSuspected: injection,
  });

  return {
    response: result.response,
    sources: result.sources,
    toolCalls: result.toolCalls,
    meta: {
      level, mode, latencyMs,
      model: levelConfig.usesLLM ? config.llm.model : null,
      injectionSuspected: injection,
      ...result.meta,
    },
  };
}

module.exports = { handleChat, ChatError };
