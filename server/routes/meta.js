/** Routes d'information : configuration publique, santé, indicateurs. */
const express = require('express');
const config = require('../../config/chatbot');
const llm = require('../llm/client');
const metrics = require('../observability/metrics');
const knowledgeBase = require('../rag/knowledgeBase');
const { enabledTools } = require('../tools/registry');

const router = express.Router();

// Configuration utile au navigateur. Ne contient AUCUN secret.
router.get('/config', (req, res) => {
  res.json({
    bot: config.bot,
    llmAvailable: llm.isConfigured(),
    levels: config.levels,
    modes: config.modes,
    maxMessageLength: config.conversation.maxMessageLength,
    tools: enabledTools().map((t) => t.name),
    knowledge: knowledgeBase.stats(),
  });
});

router.get('/health', (req, res) => res.json({ status: 'ok' }));

// Indicateurs d'usage : réservés à localhost ou au porteur du jeton METRICS_TOKEN.
router.get('/metrics', (req, res) => {
  const token = config.security.metricsToken;
  const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
  const authorized = token ? req.get('authorization') === `Bearer ${token}` : local;
  if (!authorized) return res.status(403).json({ error: 'Accès refusé.' });
  return res.json({ ...metrics.snapshot(), knowledge: knowledgeBase.stats() });
});

module.exports = router;
