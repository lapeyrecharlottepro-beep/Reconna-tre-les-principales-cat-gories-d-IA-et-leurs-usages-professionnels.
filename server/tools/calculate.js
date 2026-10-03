/**
 * Outil : calculatrice sûre.
 * L'expression est analysée par un petit analyseur dédié (jamais par eval),
 * qui n'accepte que des nombres, + - * / % ^ et des parenthèses.
 */
function evaluate(expression) {
  if (/\d\s+[\d.]/.test(String(expression))) throw new Error('Expression invalide (nombres séparés par un espace).');
  const src = String(expression).replace(/\s+/g, '').replace(/(\d),(\d)/g, '$1.$2');
  if (!src || src.length > 200) throw new Error('Expression vide ou trop longue.');
  if (!/^[0-9.+\-*/%^()]+$/.test(src)) throw new Error('Caractères non autorisés dans le calcul.');
  let i = 0;
  const peek = () => src[i];

  function number() {
    const m = src.slice(i).match(/^\d+(\.\d+)?|^\.\d+/);
    if (!m) throw new Error('Expression invalide.');
    i += m[0].length;
    return parseFloat(m[0]);
  }
  function factor() {
    if (peek() === '-') { i += 1; return -factor(); }
    if (peek() === '+') { i += 1; return factor(); }
    let value;
    if (peek() === '(') {
      i += 1; value = expr();
      if (peek() !== ')') throw new Error('Parenthèse manquante.');
      i += 1;
    } else {
      value = number();
    }
    if (peek() === '^') { i += 1; value **= factor(); }
    return value;
  }
  function term() {
    let value = factor();
    while (['*', '/', '%'].includes(peek())) {
      const op = src[i]; i += 1;
      const right = factor();
      if ((op === '/' || op === '%') && right === 0) throw new Error('Division par zéro.');
      value = op === '*' ? value * right : op === '/' ? value / right : value % right;
    }
    return value;
  }
  function expr() {
    let value = term();
    while (peek() === '+' || peek() === '-') {
      const op = src[i]; i += 1;
      value = op === '+' ? value + term() : value - term();
    }
    return value;
  }

  const result = expr();
  if (i !== src.length) throw new Error('Expression invalide.');
  if (!Number.isFinite(result)) throw new Error('Résultat non fini.');
  return Math.round(result * 1e10) / 1e10;
}

module.exports = {
  name: 'calculate',
  description: 'Calcule une expression arithmétique (nombres, + - * / % ^ et parenthèses). Exemple : « 6.8 * 0.09 » ou « (35 - 20) / 35 * 100 ».',
  parameters: {
    type: 'object',
    properties: {
      expression: { type: 'string', description: 'Expression arithmétique à calculer.' },
    },
    required: ['expression'],
    additionalProperties: false,
  },
  async execute({ expression }) {
    return { expression, result: evaluate(expression) };
  },
  evaluate,
};
