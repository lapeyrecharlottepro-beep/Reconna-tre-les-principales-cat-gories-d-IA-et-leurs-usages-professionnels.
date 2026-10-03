/**
 * Rendu Markdown minimal et SÛR pour les réponses de Leaf.
 *
 * Sécurité : tout le texte est d'abord échappé (aucun HTML venant du modèle
 * n'est interprété), puis seules quelques balises connues sont générées :
 * titres, paragraphes, listes, tableaux, gras, italique, code, citations [n].
 * Les liens ne sont volontairement pas rendus cliquables.
 */
(function () {
  'use strict';

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function inline(text) {
    return escapeHtml(text)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
      .replace(/\[(\d{1,2})\]/g, '<span class="cite" title="Source $1">$1</span>');
  }

  const isTableRow = (line) => /^\s*\|.*\|\s*$/.test(line);
  const isSeparator = (line) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);
  const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

  function render(source) {
    const lines = String(source || '').replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let paragraph = [];
    let list = null; // { type: 'ul'|'ol', items: [] }

    const flushParagraph = () => {
      if (paragraph.length) out.push(`<p>${paragraph.map(inline).join('<br>')}</p>`);
      paragraph = [];
    };
    const flushList = () => {
      if (list) out.push(`<${list.type}${list.start > 1 ? ` start="${list.start}"` : ''}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.type}>`);
      list = null;
    };
    const flush = () => { flushParagraph(); flushList(); };

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      let m;

      if (!line.trim()) { flush(); continue; }

      if ((m = line.match(/^\s*(#{1,6})\s+(.+)$/))) {
        flush();
        const level = Math.min(4, Math.max(3, m[1].length + 2)); // h3/h4 dans une bulle
        out.push(`<h${level}>${inline(m[2])}</h${level}>`);
        continue;
      }

      if (isTableRow(line) && i + 1 < lines.length && isSeparator(lines[i + 1])) {
        flush();
        const head = cells(line);
        const rows = [];
        i += 2;
        while (i < lines.length && isTableRow(lines[i])) { rows.push(cells(lines[i])); i += 1; }
        i -= 1;
        out.push(`<div class="table-wrap"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>`
          + `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
        continue;
      }

      if ((m = line.match(/^\s*[-*•]\s+(.+)$/)) || (m = line.match(/^\s*\d+[.)]\s+(.+)$/))) {
        flushParagraph();
        const type = /^\s*\d/.test(line) ? 'ol' : 'ul';
        if (list && list.type !== type) flushList();
        if (!list) list = { type, items: [], start: type === 'ol' ? parseInt(line, 10) : 1 };
        list.items.push(m[1]);
        continue;
      }

      if (list && /^\s{2,}\S/.test(line)) { // suite d'un élément de liste
        list.items[list.items.length - 1] += ` ${line.trim()}`;
        continue;
      }

      flushList();
      paragraph.push(line.trim());
    }
    flush();
    return out.join('');
  }

  window.LeafMarkdown = { render, escapeHtml };
}());
