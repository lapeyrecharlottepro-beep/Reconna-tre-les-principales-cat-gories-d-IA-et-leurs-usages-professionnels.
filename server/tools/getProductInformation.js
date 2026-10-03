/** Outil : catalogue produits et services de VERTEO (données fictives). */
const catalogue = require('../../data/products.json');
const { normalize } = require('../utils/text');

module.exports = {
  name: 'getProductInformation',
  description: 'Renvoie la fiche d\'un produit ou service VERTEO (matière, usages, fin de vie, prix indicatif, délai). '
    + 'Sans argument « product », renvoie la liste du catalogue. Les prix sont indicatifs : ne jamais les présenter comme une offre.',
  parameters: {
    type: 'object',
    properties: {
      product: { type: 'string', description: 'Nom ou usage recherché (ex. « Kraft\'In », « calage »).' },
    },
    additionalProperties: false,
  },
  async execute({ product } = {}) {
    const notice = catalogue._notice;
    const all = [...catalogue.products, ...catalogue.services];
    if (!product) return { notice, catalogue: all.map(({ id, name, type, description }) => ({ id, name, type: type || description })) };
    const q = normalize(product);
    const found = all.filter((p) => [p.id, p.name, p.type, p.description, ...(p.uses || [])]
      .filter(Boolean).some((field) => normalize(field).includes(q) || q.includes(normalize(p.name))));
    if (!found.length) return { notice, found: false, message: `Aucun produit ou service ne correspond à « ${product} ».` };
    return { notice, found: true, products: found };
  },
};
