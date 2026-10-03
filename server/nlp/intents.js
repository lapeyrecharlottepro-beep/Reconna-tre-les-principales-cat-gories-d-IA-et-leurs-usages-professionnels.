/**
 * Niveau 1 — Base d'intentions du chatbot NLP.
 *
 * Chaque intention contient :
 *  - examples : phrases d'exemple (le moteur compare la question à ces phrases) ;
 *  - keywords : mots-clés qui renforcent la reconnaissance ;
 *  - response : réponse PRÉDÉFINIE (texte fixe ou fonction utilisant les entités).
 *
 * Pédagogie : le chatbot comprend des formulations variées, mais il ne sait
 * répondre qu'avec ce qui a été écrit à l'avance. Il ne « génère » rien.
 */
const company = require('../../data/company.json');
const { employees } = require('../../data/employees.json');
const catalogue = require('../../data/products.json');

const intents = [
  {
    id: 'salutation',
    label: 'Salutation',
    examples: ['bonjour', 'salut', 'hello', 'bonsoir', 'coucou leaf'],
    keywords: ['bonjour', 'salut', 'hello', 'bonsoir', 'coucou'],
    response: () => "Bonjour, je suis Leaf, l'assistant conversationnel de VERTEO. Vous pouvez me demander une présentation de VERTEO, le fonctionnement du service commercial, nos produits ou l'organigramme.",
  },
  {
    id: 'presentation_verteo',
    label: "Présentation de l'entreprise",
    examples: ['présente-moi VERTEO', 'qui est VERTEO', "que fait l'entreprise", "parle-moi de l'entreprise", 'quelle est l activité de verteo', 'peux-tu me présenter verteo'],
    keywords: ['present', 'entreprise', 'activit', 'societe', 'histoire'],
    response: () => [
      `**${company.name}** est une PME (fictive) de ${company.headcount} collaborateurs, créée en ${company.founded}.`,
      `- Activité : ${company.activity.toLowerCase()}.`,
      `- Direction : ${company.leader}.`,
      `- Signature : « ${company.signature} ».`,
      `- Valeurs : ${company.values.join(', ')}.`,
    ].join('\n'),
  },
  {
    id: 'service_commercial',
    label: 'Service commercial',
    examples: ['comment fonctionne le service commercial', 'je souhaite comprendre le service commercial', 'qui s occupe des ventes', 'organisation de l équipe commerciale', 'service vente'],
    keywords: ['commercial', 'vente', 'vendeur', 'client'],
    response: () => [
      'Bien sûr. Le service commercial de VERTEO compte 8 personnes, sous la responsabilité de Samia.',
      '1. Réception et enregistrement de la demande dans le CRM.',
      '2. Qualification du prospect (grille B2DE).',
      '3. Découverte et proposition, selon la politique commerciale validée.',
      '4. Réponse écrite au client, relue avant envoi.',
      '5. Suivi et relance à 7 jours.',
    ].join('\n'),
  },
  {
    id: 'qualification_prospect',
    label: 'Qualification de prospect',
    examples: ['comment qualifier un prospect', 'qualification d un prospect', 'grille de qualification', 'critères pour qualifier un client potentiel'],
    keywords: ['qualifi', 'prospect', 'b2de'],
    response: () => 'Un prospect est qualifié avec la grille B2DE : Besoin, Budget, Décideur, Délai, Engagement environnemental. Score de 4 ou 5 : prospect qualifié ; 3 : à nourrir ; moins de 3 : pas de proposition.',
  },
  {
    id: 'organigramme',
    label: 'Organigramme',
    examples: ['organigramme', 'qui dirige les services', 'liste des responsables', 'comment est organisée l entreprise', 'quels sont les services'],
    keywords: ['organigramme', 'responsabl', 'service', 'organis', 'equip'],
    response: () => ['Les services de VERTEO et leurs responsables :',
      ...company.departments.map((d) => `- ${d.name} : ${d.manager} (${d.headcount} pers.)`)].join('\n'),
  },
  {
    id: 'qui_est',
    label: "Information sur un collaborateur",
    examples: ['qui est julia', 'que fait eliott', 'quel est le rôle de samia', 'présente-moi marc'],
    keywords: ['qui', 'role', 'fait'],
    requiresEntity: 'employee',
    response: ({ employee }) => {
      if (!employee) return 'De quel collaborateur parlez-vous ? Je connais : ' + employees.map((e) => e.firstName).join(', ') + '.';
      return `**${employee.firstName}** — ${employee.role} (${employee.department}).\nResponsabilités : ${employee.responsibilities.join(', ')}.`;
    },
  },
  {
    id: 'produits',
    label: 'Produits et services',
    examples: ['quels sont vos produits', 'catalogue', 'que vendez-vous', 'parle-moi de kraft in', 'quels emballages proposez-vous'],
    keywords: ['produit', 'catalogu', 'emballag', 'gamm', 'vend'],
    response: ({ product }) => {
      if (product) return `**${product.name}** — ${product.type}.\nMatière : ${product.material}.\nFin de vie : ${product.endOfLife}.`;
      return ['Le catalogue VERTEO :', ...catalogue.products.map((p) => `- **${p.name}** : ${p.type}`),
        'Services : ' + catalogue.services.map((s) => s.name).join(', ') + '.'].join('\n');
    },
  },
  {
    id: 'teletravail',
    label: 'Télétravail',
    examples: ['télétravail', 'puis-je travailler de chez moi', 'combien de jours de télétravail', 'travail à distance'],
    keywords: ['teletravail', 'distanc', 'maison', 'domicil'],
    response: () => "Le télétravail est possible jusqu'à 2 jours par semaine pour les postes de bureau, après la période d'essai et avec l'accord du responsable.",
  },
  {
    id: 'conges',
    label: 'Congés',
    examples: ['congés payés', 'comment poser des vacances', 'combien de jours de congés', 'demande de congés'],
    keywords: ['conge', 'vacanc', 'absenc'],
    response: () => "25 jours ouvrés de congés payés par an. La demande se fait dans l'outil RH au moins 3 semaines avant le départ.",
  },
  {
    id: 'niveaux_chatbot',
    label: 'Explication des niveaux',
    examples: ['quelle est la différence entre les niveaux', 'tu es quel type de chatbot', 'comment fonctionnes-tu', 'qu est-ce que le nlp'],
    keywords: ['niveau', 'nlp', 'fonctionn', 'chatbot', 'rag', 'agent'],
    response: () => [
      'Je suis ici en **niveau 1 — NLP** : je reconnais l\'intention de votre phrase et je réponds avec un texte écrit à l\'avance.',
      '- Niveau 2 : l\'IA générative rédige une réponse adaptée.',
      '- Niveau 3 : le RAG recherche d\'abord dans les documents VERTEO.',
      '- Niveau 4 : l\'agent utilise des outils autorisés.',
    ].join('\n'),
  },
  {
    id: 'remerciement',
    label: 'Remerciement',
    examples: ['merci', 'merci beaucoup', 'super merci', 'parfait merci'],
    keywords: ['merci', 'parfait', 'super', 'top'],
    response: () => 'Avec plaisir ! Avez-vous une autre question sur VERTEO ?',
  },
  {
    id: 'au_revoir',
    label: 'Au revoir',
    examples: ['au revoir', 'à bientôt', 'bonne journée', 'bye'],
    keywords: ['revoir', 'bientot', 'bye', 'journee'],
    response: () => 'Au revoir, et à bientôt ! Chaque geste compte.',
  },
];

const FALLBACK = "Je n'ai pas compris votre demande. En niveau 1, je ne reconnais qu'un nombre limité d'intentions : présentation de VERTEO, service commercial, qualification d'un prospect, organigramme, collaborateurs, produits, télétravail, congés.\n\nPour une question ouverte, une analyse ou un cas pratique, passez au niveau 2, 3 ou 4.";

module.exports = { intents, FALLBACK };
