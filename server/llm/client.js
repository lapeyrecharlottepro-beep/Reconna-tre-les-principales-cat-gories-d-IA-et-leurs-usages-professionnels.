/**
 * Accès au modèle de langage (API OpenAI).
 * La clé est lue côté serveur uniquement (fichier .env) ; elle n'est jamais
 * transmise au navigateur ni journalisée.
 */
const OpenAI = require('openai');
const config = require('../../config/chatbot');

let client = null;

function isConfigured() {
  return Boolean(config.llm.apiKey);
}

function getClient() {
  if (!isConfigured()) {
    const err = new Error("La clé OPENAI_API_KEY n'est pas configurée sur le serveur.");
    err.code = 'LLM_NOT_CONFIGURED';
    throw err;
  }
  if (!client) {
    client = new OpenAI({
      apiKey: config.llm.apiKey,
      baseURL: config.llm.baseURL,
      timeout: config.llm.timeoutMs,
      maxRetries: 1,
    });
  }
  return client;
}

/** Appel de génération (Chat Completions), avec ou sans outils. */
async function createChatCompletion({ messages, tools }) {
  const params = {
    model: config.llm.model,
    messages,
    max_completion_tokens: config.llm.maxOutputTokens,
  };
  // Certains modèles (raisonnement) n'acceptent pas la température : mettre null dans la config.
  if (config.llm.temperature !== null) params.temperature = config.llm.temperature;
  if (tools && tools.length) {
    params.tools = tools;
    params.tool_choice = 'auto';
  }
  return getClient().chat.completions.create(params);
}

/** Calcul des embeddings d'une liste de textes. */
async function createEmbeddings(texts) {
  const res = await getClient().embeddings.create({ model: config.rag.embeddingModel, input: texts });
  return res.data.map((d) => d.embedding);
}

module.exports = { isConfigured, createChatCompletion, createEmbeddings };
