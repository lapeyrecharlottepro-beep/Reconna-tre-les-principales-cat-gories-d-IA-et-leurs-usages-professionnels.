/**
 * Configuration centralisée de Leaf.
 *
 * Tous les réglages du chatbot sont regroupés ici : on ne les disperse pas
 * dans le code. Les valeurs sensibles (clé API) restent dans le fichier .env.
 */
require('dotenv').config({ quiet: true });

const env = process.env;

module.exports = {
  // --- Identité ---------------------------------------------------------
  bot: {
    name: 'Leaf',
    company: 'VERTEO',
    tagline: "Emballer aujourd'hui, préserver demain",
    greeting: 'Bonjour, je suis Leaf, l\'assistant conversationnel de VERTEO.',
  },

  // --- Serveur ----------------------------------------------------------
  server: {
    port: Number(env.PORT) || 3000,
    // Taille maximale du corps JSON accepté par /api/chat
    bodyLimit: '64kb',
  },

  // --- Modèle de langage (niveaux 2 à 4) ----------------------------------
  llm: {
    apiKey: env.OPENAI_API_KEY || '',
    baseURL: env.OPENAI_BASE_URL || undefined,
    model: env.OPENAI_MODEL || 'gpt-4.1-mini',
    // Créativité des réponses (0 = déterministe). null pour les modèles qui ne l'acceptent pas.
    temperature: 0.4,
    maxOutputTokens: 800, // longueur maximale d'une réponse
    timeoutMs: 30000,
  },

  // --- Conversation -------------------------------------------------------
  conversation: {
    // Nombre maximal de messages d'historique renvoyés au modèle
    // (contrôle des coûts et des tokens).
    maxHistoryMessages: 12,
    // Taille maximale d'un message utilisateur (caractères)
    maxMessageLength: 2000,
    // Taille maximale d'un message d'historique (les longues réponses sont tronquées)
    maxHistoryItemLength: 4000,
  },

  // --- Niveaux pédagogiques -------------------------------------------------
  levels: {
    default: 'agent',
    available: {
      nlp: { order: 1, label: 'NLP', usesLLM: false },
      generative: { order: 2, label: 'IA générative', usesLLM: true },
      rag: { order: 3, label: 'RAG', usesLLM: true },
      agent: { order: 4, label: 'Agent', usesLLM: true },
    },
  },

  // --- Modes pédagogiques ---------------------------------------------------
  modes: {
    default: 'assistant',
    available: ['assistant', 'formateur'],
  },

  // --- RAG -------------------------------------------------------------------
  rag: {
    knowledgeDir: 'knowledge',
    vectorStorePath: 'data/vector-store.json',
    embeddingModel: env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    chunkSize: 1200, // caractères par extrait
    chunkOverlap: 200, // recouvrement maximal entre deux extraits
    topK: 4, // nombre d'extraits injectés dans le contexte
    // Score minimal pour qu'un extrait soit retenu
    // (similarité cosinus pour les embeddings, score normalisé pour la recherche lexicale)
    minScoreVector: 0.3,
    minScoreLexical: 0.3,
  },

  // --- Agent (niveau 4) ------------------------------------------------------
  agent: {
    // Nombre maximal d'aller-retours modèle ↔ outils pour une même question
    maxIterations: 4,
    // Seuls ces outils sont proposés au modèle (liste blanche)
    enabledTools: [
      'searchKnowledgeBase',
      'getCompanyInformation',
      'getEmployeeInformation',
      'getProductInformation',
      'calculate',
      // 'triggerN8nWorkflow', // à activer quand un webhook n8n est prêt
    ],
  },

  // --- NLP (niveau 1) -------------------------------------------------------
  nlp: {
    // Score minimal pour considérer qu'une intention est reconnue
    minConfidence: 0.34,
  },

  // --- Sécurité ----------------------------------------------------------------
  security: {
    rateLimit: { windowMs: 60 * 1000, max: 20 },
    metricsToken: env.METRICS_TOKEN || '',
  },

  // --- Intégrations futures ------------------------------------------------------
  integrations: {
    n8nWebhookUrl: env.N8N_WEBHOOK_URL || '',
  },
};
