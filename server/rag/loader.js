/**
 * RAG — étape 1 : ingestion.
 * Lit les documents Markdown du dossier /knowledge (un sous-dossier par
 * domaine) et extrait leurs métadonnées (en-tête « front matter »).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SUPPORTED = new Set(['.md', '.txt']);

function parseFrontMatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { meta: {}, body: raw };
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^(\w+)\s*:\s*(.*)$/);
    if (m) meta[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return { meta, body: raw.slice(match[0].length) };
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(full);
    return SUPPORTED.has(path.extname(entry.name).toLowerCase()) ? [full] : [];
  });
}

/** @returns {{id:string,title:string,category:string,path:string,text:string}[]} */
function loadDocuments(knowledgeDir) {
  const base = path.resolve(ROOT, knowledgeDir);
  return listFiles(base).sort().map((file) => {
    const { meta, body } = parseFrontMatter(fs.readFileSync(file, 'utf8'));
    const relative = path.relative(base, file).split(path.sep).join('/');
    const firstHeading = body.match(/^#\s+(.+)$/m);
    return {
      id: relative,
      title: meta.title || (firstHeading && firstHeading[1].trim()) || path.basename(file),
      category: meta.category || relative.split('/')[0],
      path: `knowledge/${relative}`,
      text: body.trim(),
    };
  });
}

module.exports = { loadDocuments, parseFrontMatter };
