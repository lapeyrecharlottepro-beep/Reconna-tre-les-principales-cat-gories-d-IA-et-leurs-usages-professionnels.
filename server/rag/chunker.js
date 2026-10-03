/**
 * RAG — étape 2 : découpage des documents en extraits (« chunks »).
 * On découpe d'abord par section (titres Markdown), puis on redécoupe les
 * sections trop longues par paragraphes avec un léger recouvrement.
 * Chaque extrait garde le titre de sa section pour rester compréhensible seul.
 */
function splitSections(text) {
  const sections = [];
  let current = { heading: '', lines: [] };
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^#{1,4}\s+(.+)$/);
    if (h) {
      if (current.lines.join('').trim()) sections.push(current);
      current = { heading: h[1].trim(), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.join('').trim()) sections.push(current);
  return sections.map((s) => ({ heading: s.heading, body: s.lines.join('\n').trim() }));
}

function splitLong(body, size, overlap) {
  if (body.length <= size) return [body];
  const paragraphs = body.split(/\n{2,}/);
  const parts = [];
  let buffer = '';
  for (const p of paragraphs) {
    if (buffer && (buffer.length + p.length + 2) > size) {
      parts.push(buffer);
      // Recouvrement : on reprend le dernier paragraphe s'il est court, pour garder le fil.
      const last = buffer.split(/\n{2,}/).pop();
      buffer = last.length <= overlap ? last : '';
    }
    buffer = buffer ? `${buffer}\n\n${p}` : p;
    while (buffer.length > size * 1.5) { // paragraphe exceptionnellement long
      parts.push(buffer.slice(0, size));
      buffer = buffer.slice(size - overlap);
    }
  }
  if (buffer.trim()) parts.push(buffer);
  return parts;
}

/**
 * @param {{id,title,category,path,text}} doc
 * @returns {{id,docId,title,category,path,section,text}[]}
 */
function chunkDocument(doc, { chunkSize = 1200, chunkOverlap = 200 } = {}) {
  const chunks = [];
  for (const section of splitSections(doc.text)) {
    splitLong(section.body, chunkSize, chunkOverlap).forEach((part) => {
      const heading = section.heading && section.heading !== doc.title ? ` — ${section.heading}` : '';
      chunks.push({
        id: `${doc.id}#${chunks.length}`,
        docId: doc.id,
        title: doc.title,
        category: doc.category,
        path: doc.path,
        section: section.heading,
        text: `${doc.title}${heading}\n${part.trim()}`,
      });
    });
  }
  return chunks;
}

module.exports = { chunkDocument, splitSections };
