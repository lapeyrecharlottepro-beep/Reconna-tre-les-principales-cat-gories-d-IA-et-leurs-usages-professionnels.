/** Outil : informations professionnelles sur un collaborateur fictif. */
const { employees, _notice: notice } = require('../../data/employees.json');
const { normalize } = require('../utils/text');

module.exports = {
  name: 'getEmployeeInformation',
  description: "Renvoie le rôle, le service, le responsable et les responsabilités d'un collaborateur de VERTEO (prénom ou fonction). "
    + 'Sans argument « name », renvoie la liste des collaborateurs référencés.',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Prénom ou fonction (ex. « Julia », « responsable logistique »).' },
    },
    additionalProperties: false,
  },
  async execute({ name } = {}) {
    if (!name) return { notice, employees: employees.map(({ firstName, role }) => ({ firstName, role })) };
    const q = normalize(name);
    const found = employees.filter((e) => normalize(e.firstName) === q
      || normalize(e.role).includes(q) || normalize(e.department).includes(q));
    if (!found.length) return { notice, found: false, message: `Aucun collaborateur référencé pour « ${name} ».` };
    return { notice, found: true, employees: found };
  },
};
