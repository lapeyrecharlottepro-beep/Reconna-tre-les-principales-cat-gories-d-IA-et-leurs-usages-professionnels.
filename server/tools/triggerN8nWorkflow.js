/**
 * Outil (désactivé par défaut) : déclenchement d'un workflow n8n.
 *
 * Exemple d'extension vers des actions réelles. Pour l'activer :
 *  1. renseigner N8N_WEBHOOK_URL dans .env ;
 *  2. ajouter 'triggerN8nWorkflow' à config.agent.enabledTools.
 * Seuls les workflows de la liste blanche ci-dessous peuvent être déclenchés.
 */
const config = require('../../config/chatbot');

const ALLOWED_WORKFLOWS = ['notifier_responsable', 'creer_tache_crm'];

module.exports = {
  name: 'triggerN8nWorkflow',
  description: 'Déclenche un workflow n8n autorisé (notification d\'un responsable, création d\'une tâche CRM fictive). '
    + 'À utiliser uniquement si l\'utilisateur le demande explicitement.',
  parameters: {
    type: 'object',
    properties: {
      workflow: { type: 'string', enum: ALLOWED_WORKFLOWS, description: 'Workflow à déclencher.' },
      summary: { type: 'string', description: 'Résumé court de la demande (sans donnée personnelle).' },
    },
    required: ['workflow', 'summary'],
    additionalProperties: false,
  },
  async execute({ workflow, summary }) {
    if (!config.integrations.n8nWebhookUrl) throw new Error('Intégration n8n non configurée.');
    const res = await fetch(config.integrations.n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow, summary, source: 'leaf' }),
      signal: AbortSignal.timeout(8000),
    });
    return { workflow, status: res.ok ? 'déclenché' : `erreur ${res.status}` };
  },
};
