/**
 * Registre des outils de l'agent (niveau 4).
 *
 * Principe de sécurité : le modèle ne peut appeler QUE les outils listés
 * dans config.agent.enabledTools. Chaque outil est un module indépendant
 * qui expose :
 *   - name        : identifiant unique
 *   - description : ce que fait l'outil (lu par le modèle)
 *   - parameters  : schéma JSON des arguments
 *   - execute(args, context) : fonction asynchrone qui renvoie un objet JSON
 */
const config = require('../../config/chatbot');

const ALL_TOOLS = [
  require('./searchKnowledgeBase'),
  require('./getCompanyInformation'),
  require('./getEmployeeInformation'),
  require('./getProductInformation'),
  require('./calculate'),
  require('./triggerN8nWorkflow'),
];

const MAX_RESULT_CHARS = 6000;

function enabledTools() {
  return ALL_TOOLS.filter((t) => config.agent.enabledTools.includes(t.name));
}

/** Définitions au format attendu par l'API OpenAI (function calling). */
function toolDefinitions() {
  return enabledTools().map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

/** Vérification minimale des arguments à partir du schéma JSON. */
function validateArgs(tool, args) {
  const schema = tool.parameters || {};
  for (const key of schema.required || []) {
    if (args[key] === undefined || args[key] === null || args[key] === '') throw new Error(`Argument manquant : ${key}`);
  }
  for (const [key, value] of Object.entries(args)) {
    const def = schema.properties && schema.properties[key];
    if (!def) throw new Error(`Argument non autorisé : ${key}`);
    if (def.type === 'string' && (typeof value !== 'string' || value.length > 500)) throw new Error(`Argument invalide : ${key}`);
    if (def.type === 'integer' && !Number.isInteger(value)) throw new Error(`Argument invalide : ${key}`);
    if (def.enum && !def.enum.includes(value)) throw new Error(`Valeur non autorisée pour ${key}`);
  }
}

/**
 * Exécute un appel d'outil demandé par le modèle.
 * @returns {Promise<{ ok: boolean, result?: object, error?: string }>}
 */
async function executeTool(name, rawArgs, context) {
  const tool = enabledTools().find((t) => t.name === name);
  if (!tool) return { ok: false, error: `Outil non autorisé : ${name}` };
  let args;
  try {
    args = rawArgs ? JSON.parse(rawArgs) : {};
    if (typeof args !== 'object' || Array.isArray(args) || args === null) throw new Error('Arguments invalides');
    validateArgs(tool, args);
  } catch (err) {
    return { ok: false, args: null, error: err.message };
  }
  try {
    const result = await tool.execute(args, context);
    return { ok: true, args, result };
  } catch (err) {
    return { ok: false, args, error: err.message };
  }
}

/** Sérialise le résultat pour le modèle, en limitant sa taille. */
function serializeResult(outcome) {
  const json = JSON.stringify(outcome.ok ? outcome.result : { error: outcome.error });
  return json.length > MAX_RESULT_CHARS ? `${json.slice(0, MAX_RESULT_CHARS)}…(tronqué)` : json;
}

module.exports = { toolDefinitions, executeTool, serializeResult, enabledTools, ALL_TOOLS };
