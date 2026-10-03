/** Outil : fiche d'identité structurée de VERTEO (données fictives). */
const company = require('../../data/company.json');

const TOPICS = ['general', 'values', 'departments', 'keyFigures'];

module.exports = {
  name: 'getCompanyInformation',
  description: "Renvoie les informations structurées de VERTEO : identité générale, valeurs, services (départements et responsables) ou chiffres clés.",
  parameters: {
    type: 'object',
    properties: {
      topic: { type: 'string', enum: TOPICS, description: 'Rubrique demandée.' },
    },
    required: ['topic'],
    additionalProperties: false,
  },
  async execute({ topic }) {
    const { _notice: notice, values, departments, keyFigures, ...general } = company;
    const data = { general, values, departments, keyFigures }[topic];
    return { notice, topic, data };
  },
};
