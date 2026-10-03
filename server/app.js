/**
 * Application Express : sécurité HTTP, fichiers statiques et API.
 */
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('../config/chatbot');
const logger = require('./observability/logger');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');

  // En-têtes de sécurité, dont une politique de contenu stricte :
  // le navigateur ne charge que des ressources du serveur lui-même.
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
      },
    },
  }));

  app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h' }));

  const api = express.Router();
  api.use(express.json({ limit: config.server.bodyLimit }));
  api.use('/chat', rateLimit({
    windowMs: config.security.rateLimit.windowMs,
    limit: config.security.rateLimit.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Trop de messages en peu de temps. Patientez une minute avant de réessayer.' },
  }));
  api.use(require('./routes/chat'));
  api.use(require('./routes/meta'));
  api.use((req, res) => res.status(404).json({ error: 'Ressource introuvable.' }));
  app.use('/api', api);

  // Gestion centralisée des erreurs : message clair, jamais de détail technique.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    let status = err.status || err.statusCode || 500;
    let message = err.expose && err.message ? err.message : 'Une erreur interne est survenue.';
    if (err.type === 'entity.too.large') { status = 413; message = 'La requête est trop volumineuse.'; }
    if (err.type === 'entity.parse.failed') { status = 400; message = 'Requête JSON invalide.'; }
    if (status >= 500) logger.error('request_failed', { path: req.path, status, type: err.name });
    res.status(status).json({ error: message });
  });

  return app;
}

module.exports = { createApp };
