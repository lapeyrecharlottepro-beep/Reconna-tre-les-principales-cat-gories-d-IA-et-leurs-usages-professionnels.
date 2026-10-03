/**
 * Leaf — logique de l'interface.
 * Le navigateur ne connaît AUCUN secret : il dialogue uniquement avec /api.
 */
(function () {
  'use strict';

  const { render, escapeHtml } = window.LeafMarkdown;

  // ---------- Contenus pédagogiques de l'interface ----------
  const LEVEL_INFO = {
    nlp: {
      num: 1, name: 'NLP', short: 'Comprend l\'intention, répond par des textes prévus.',
      banner: 'Leaf reconnaît l\'intention de votre phrase et répond avec un texte écrit à l\'avance. Aucune IA générative : posez une question imprévue pour observer ses limites.',
      typing: 'Leaf analyse votre phrase…',
    },
    generative: {
      num: 2, name: 'IA générative', short: 'Rédige une réponse adaptée, sans documents.',
      banner: 'Leaf rédige une réponse sur mesure avec un modèle de langage, mais sans accès aux documents VERTEO : il ne connaît que la fiche d\'identité de l\'entreprise.',
      typing: 'Leaf rédige sa réponse…',
    },
    rag: {
      num: 3, name: 'RAG', short: 'Cherche dans les documents VERTEO avant de répondre.',
      banner: 'Avant chaque réponse, Leaf recherche des extraits dans la base documentaire VERTEO, s\'appuie dessus et cite ses sources.',
      typing: 'Leaf consulte les documents VERTEO…',
    },
    agent: {
      num: 4, name: 'Agent', short: 'Raisonne et utilise des outils autorisés.',
      banner: 'Leaf raisonne sur la tâche et décide lui-même d\'utiliser des outils autorisés : recherche documentaire, fiches collaborateurs et produits, calculs.',
      typing: 'Leaf réfléchit et choisit ses outils…',
    },
  };
  const MODE_LABEL = { assistant: 'Assistant', formateur: 'Formateur' };

  const SUGGESTIONS = [
    { label: 'Présente-moi VERTEO', send: 'Présente-moi VERTEO' },
    { label: 'Comment fonctionne le service commercial ?', send: 'Comment fonctionne le service commercial ?' },
    { label: 'Aide-moi à résoudre cette situation', prefill: 'Aide-moi à résoudre cette situation : ' },
    { label: 'Recherche une information dans les documents VERTEO', prefill: 'Recherche dans les documents VERTEO : ' },
    { label: 'Analyse ce cas pratique', send: 'Analyse ce cas pratique : tu es responsable commercial chez VERTEO. Un client important menace de quitter l\'entreprise. Que fais-tu ?' },
  ];

  const TOOL_LABEL = {
    searchKnowledgeBase: 'Recherche documentaire',
    getCompanyInformation: 'Informations entreprise',
    getEmployeeInformation: 'Fiche collaborateur',
    getProductInformation: 'Fiche produit',
    calculate: 'Calcul',
    triggerN8nWorkflow: 'Workflow n8n',
  };

  // ---------- Éléments ----------
  const $ = (sel) => document.querySelector(sel);
  const els = {
    messages: $('#messages'), welcome: $('#welcome'), suggestions: $('#suggestions'),
    form: $('#composer'), input: $('#input'), send: $('#send'), count: $('#count'),
    levels: $('#levels'), modes: $('#modes'), banner: $('#level-banner'),
    status: $('#status'), statusText: $('#status-text'), newChat: $('#new-chat'),
    tpl: $('#tpl-message'),
  };

  // ---------- État ----------
  const store = {
    get(key, fallback) { try { const v = sessionStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
    set(key, value) { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* stockage indisponible */ } },
    pref(key, value) {
      try { if (value === undefined) return localStorage.getItem(key); localStorage.setItem(key, value); } catch { /* idem */ }
      return null;
    },
  };
  const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `c-${Date.now()}-${Math.random().toString(16).slice(2)}`);

  const state = {
    config: null,
    level: store.pref('leaf.level') || 'agent',
    mode: store.pref('leaf.mode') || 'assistant',
    conversationId: store.get('leaf.conversationId', null) || newId(),
    transcript: store.get('leaf.transcript', []),
    busy: false,
  };

  const save = () => {
    store.set('leaf.transcript', state.transcript.slice(-60));
    store.set('leaf.conversationId', state.conversationId);
  };

  const levelAvailable = (level) => !state.config || !state.config.levels.available[level].usesLLM || state.config.llmAvailable;

  // ---------- Réglages : niveaux et modes ----------
  function renderLevels() {
    els.levels.innerHTML = Object.entries(LEVEL_INFO).map(([id, info]) => `
      <button type="button" role="radio" class="level" data-level="${id}" aria-checked="false">
        <span class="level__num">${info.num}</span>
        <strong>${escapeHtml(info.name)}</strong>
        <span>${escapeHtml(info.short)}</span>
      </button>`).join('');
  }

  function syncSettings() {
    els.levels.querySelectorAll('.level').forEach((b) => {
      b.setAttribute('aria-checked', String(b.dataset.level === state.level));
      b.tabIndex = b.dataset.level === state.level ? 0 : -1;
      if (!levelAvailable(b.dataset.level)) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
    });
    els.modes.querySelectorAll('.mode').forEach((b) => {
      b.setAttribute('aria-checked', String(b.dataset.mode === state.mode));
      b.tabIndex = b.dataset.mode === state.mode ? 0 : -1;
    });
    const info = LEVEL_INFO[state.level];
    const modeNote = state.level === 'nlp'
      ? ' Le mode pédagogique ne s\'applique pas à ce niveau.'
      : (state.mode === 'formateur' ? ' Mode formateur : Leaf vous guide par questions plutôt que de donner la solution.' : '');
    els.banner.innerHTML = `<strong>Niveau ${info.num} · ${escapeHtml(info.name)}</strong><p>${escapeHtml(info.banner + modeNote)}</p>`;
  }

  function setLevel(level) {
    if (level === state.level) return;
    if (!levelAvailable(level)) {
      addError('Ce niveau utilise l\'API OpenAI, mais la clé n\'est pas configurée sur le serveur. Seul le niveau 1 (NLP) est disponible.');
      return;
    }
    state.level = level;
    store.pref('leaf.level', level);
    if (state.transcript.length) addDivider(`Niveau ${LEVEL_INFO[level].num} · ${LEVEL_INFO[level].name}`);
    syncSettings();
  }

  function setMode(mode) {
    if (mode === state.mode) return;
    state.mode = mode;
    store.pref('leaf.mode', mode);
    if (state.transcript.length) addDivider(`Mode ${MODE_LABEL[mode]}`);
    syncSettings();
  }

  // Navigation clavier dans les groupes radio (flèches)
  function radioKeys(container, selector, key, setter) {
    container.addEventListener('keydown', (e) => {
      if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      const items = [...container.querySelectorAll(selector)];
      const idx = items.findIndex((b) => b.getAttribute('aria-checked') === 'true');
      const next = items[(idx + (['ArrowDown', 'ArrowRight'].includes(e.key) ? 1 : items.length - 1)) % items.length];
      e.preventDefault();
      setter(next.dataset[key]);
      container.querySelector(`[aria-checked="true"]`).focus();
    });
  }

  // ---------- Affichage des messages ----------
  const timeLabel = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  function scrollToEnd() { els.messages.scrollTop = els.messages.scrollHeight; }

  function buildMessage({ role, content, time, level, extras }) {
    const node = els.tpl.content.firstElementChild.cloneNode(true);
    const isUser = role === 'user';
    node.classList.add(isUser ? 'msg--user' : 'msg--leaf');
    if (isUser) node.querySelector('.msg__avatar').textContent = 'V';
    node.querySelector('.msg__author').textContent = isUser ? 'Vous' : 'Leaf';
    if (!isUser && level) node.querySelector('.msg__badge').textContent = `Niv. ${LEVEL_INFO[level].num} · ${LEVEL_INFO[level].name}`;
    const t = node.querySelector('.msg__time');
    t.dateTime = time; t.textContent = timeLabel(time);
    const body = node.querySelector('.msg__body');
    if (isUser) body.textContent = content;
    else { body.classList.add('md'); body.innerHTML = render(content); }
    if (extras) node.querySelector('.msg__main').appendChild(extras);
    return node;
  }

  function renderExtras(item) {
    const wrap = document.createElement('div');
    wrap.className = 'extras';
    const { sources = [], toolCalls = [], meta = {} } = item;

    if (sources.length) {
      wrap.insertAdjacentHTML('beforeend', `
        <section class="extra" aria-label="Sources VERTEO">
          <h3 class="extra__title"><svg aria-hidden="true"><use href="#doc"/></svg>Sources VERTEO</h3>
          <ul>${sources.map((s) => `<li><span class="num">${s.n}</span><span>${escapeHtml(s.title)} <span class="muted">· ${escapeHtml(s.path)}</span></span></li>`).join('')}</ul>
        </section>`);
    }

    if (toolCalls.length) {
      wrap.insertAdjacentHTML('beforeend', `
        <section class="extra" aria-label="Outils utilisés">
          <h3 class="extra__title"><svg aria-hidden="true"><use href="#tool"/></svg>Outils utilisés par l'agent</h3>
          <ul>${toolCalls.map((c, i) => `<li><span class="num">${i + 1}</span><span>
            <span class="tool-name${c.ok ? '' : ' is-error'}">${escapeHtml(TOOL_LABEL[c.name] || c.name)}</span>
            <code>${escapeHtml(c.name)}(${escapeHtml(c.arguments ? JSON.stringify(c.arguments) : '')})</code>
            <span class="muted">→ ${escapeHtml(c.summary || '')} · ${Number(c.durationMs) || 0} ms</span></span></li>`).join('')}</ul>
        </section>`);
    }

    // « Coulisses » : ce qui s'est passé techniquement (pédagogie)
    const rows = [];
    rows.push(['Niveau', `${LEVEL_INFO[meta.level] ? `${LEVEL_INFO[meta.level].num} · ${LEVEL_INFO[meta.level].name}` : '—'}`]);
    if (meta.level !== 'nlp' && meta.mode) rows.push(['Mode', MODE_LABEL[meta.mode] || meta.mode]);
    if (meta.intent !== undefined) {
      rows.push(['Intention détectée', meta.intent ? `${meta.intent.label} (${meta.intent.id}) · confiance ${Math.round(meta.intent.confidence * 100)} %` : 'Aucune (réponse de repli)']);
      if (meta.alternatives && meta.alternatives.length) rows.push(['Autres hypothèses', meta.alternatives.map((a) => `${a.id} ${Math.round(a.confidence * 100)} %`).join(' · ')]);
    }
    if (meta.entities && Object.keys(meta.entities).length) rows.push(['Entités', Object.entries(meta.entities).map(([k, v]) => `${k} : ${v}`).join(' · ')]);
    if (meta.retrieval) {
      rows.push(['Recherche', meta.retrieval.method === 'embeddings' ? 'Vectorielle (embeddings)' : 'Lexicale (mots-clés)']);
      if (meta.retrieval.results) {
        rows.push(['Extraits consultés', meta.retrieval.results.length
          ? meta.retrieval.results.map((r) => `[${r.source}] ${r.title}${r.section ? ` › ${r.section}` : ''} (${r.score})`).join('\n')
          : 'Aucun extrait pertinent']);
      }
    }
    if (meta.model) rows.push(['Modèle', meta.model]);
    if (meta.latencyMs !== undefined) rows.push(['Temps de réponse', `${meta.latencyMs} ms`]);
    if (meta.injectionSuspected) rows.push(['Sécurité', 'Tentative de détournement détectée : rappel de sécurité appliqué']);

    wrap.insertAdjacentHTML('beforeend', `
      <details class="extra">
        <summary>Coulisses de la réponse</summary>
        <dl class="kv">${rows.map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v).replace(/\n/g, '<br>')}</dd>`).join('')}</dl>
      </details>`);
    return wrap;
  }

  function renderItem(item) {
    let node;
    if (item.type === 'divider') {
      node = document.createElement('div');
      node.className = 'msg msg--divider';
      node.innerHTML = `<span class="divider">${escapeHtml(item.label)}</span>`;
    } else if (item.type === 'error') {
      node = buildMessage({ role: 'assistant', content: item.content, time: item.time });
      node.classList.add('msg--error');
    } else {
      node = buildMessage({
        role: item.type, content: item.content, time: item.time, level: item.meta && item.meta.level,
        extras: item.type === 'assistant' ? renderExtras(item) : null,
      });
    }
    els.messages.appendChild(node);
    scrollToEnd();
    return node;
  }

  function push(item) {
    state.transcript.push(item);
    save();
    renderItem(item);
  }

  const now = () => new Date().toISOString();
  const addDivider = (label) => push({ type: 'divider', label, time: now() });
  const addError = (content) => push({ type: 'error', content, time: now() });

  function showTyping() {
    const node = buildMessage({ role: 'assistant', content: '', time: now(), level: state.level });
    const body = node.querySelector('.msg__body');
    body.innerHTML = `<span class="typing"><span class="typing__dots" aria-hidden="true"><i></i><i></i><i></i></span>${escapeHtml(LEVEL_INFO[state.level].typing)}</span>`;
    node.setAttribute('aria-busy', 'true');
    els.messages.appendChild(node);
    scrollToEnd();
    return node;
  }

  function setStatus(kind, text) {
    els.status.classList.toggle('status--busy', kind === 'busy');
    els.status.classList.toggle('status--down', kind === 'down');
    els.statusText.textContent = text;
  }

  function idleStatus() {
    if (!state.config) setStatus('down', 'Leaf est momentanément indisponible');
    else if (!state.config.llmAvailable) setStatus('idle', 'Leaf est disponible (niveau 1 uniquement)');
    else setStatus('idle', 'Leaf est disponible');
  }

  // ---------- Envoi ----------
  function conversationForApi() {
    return state.transcript
      .filter((i) => (i.type === 'user' || i.type === 'assistant') && !i.failed)
      .map((i) => ({ role: i.type, content: i.content }));
  }

  async function send(text) {
    const message = text.trim();
    if (!message || state.busy) return;
    const max = state.config ? state.config.maxMessageLength : 2000;
    if (message.length > max) { addError(`Votre message dépasse ${max} caractères. Raccourcissez-le, s'il vous plaît.`); return; }

    const conversation = conversationForApi();
    const userItem = { type: 'user', content: message, time: now() };
    push(userItem);
    els.input.value = '';
    autoGrow(); updateCount();

    state.busy = true;
    els.send.disabled = true;
    setStatus('busy', 'Leaf rédige une réponse…');
    const typing = showTyping();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, conversation, mode: state.mode, level: state.level, conversationId: state.conversationId }),
      });
      const data = await res.json().catch(() => ({}));
      typing.remove();
      if (!res.ok) throw new Error(data.error || 'Leaf ne parvient pas à répondre pour le moment.');
      push({
        type: 'assistant', content: data.response, time: now(),
        sources: data.sources || [], toolCalls: data.toolCalls || [], meta: data.meta || {},
      });
    } catch (err) {
      typing.remove();
      userItem.failed = true; // exclu de l'historique envoyé ensuite
      addError(err.message && !/fetch/i.test(err.message) ? err.message : 'Connexion au serveur impossible. Vérifiez qu\'il est bien démarré.');
    } finally {
      state.busy = false;
      els.send.disabled = false;
      idleStatus();
      els.input.focus();
    }
  }

  function resetConversation() {
    state.transcript = [];
    state.conversationId = newId();
    save();
    els.messages.querySelectorAll('.msg').forEach((n) => n.remove());
    els.messages.scrollTop = 0;
    els.input.value = '';
    autoGrow(); updateCount();
    els.input.focus();
  }

  // ---------- Saisie ----------
  function autoGrow() {
    els.input.style.height = 'auto';
    els.input.style.height = `${Math.min(els.input.scrollHeight, 168)}px`;
  }

  function updateCount() {
    const max = state.config ? state.config.maxMessageLength : 2000;
    const len = els.input.value.length;
    els.count.textContent = len > max * 0.8 ? `${len} / ${max}` : '';
    els.count.classList.toggle('is-over', len > max);
  }

  function bindEvents() {
    els.form.addEventListener('submit', (e) => { e.preventDefault(); send(els.input.value); });
    els.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(els.input.value); }
    });
    els.input.addEventListener('input', () => { autoGrow(); updateCount(); });
    els.levels.addEventListener('click', (e) => { const b = e.target.closest('.level'); if (b) setLevel(b.dataset.level); });
    els.modes.addEventListener('click', (e) => { const b = e.target.closest('.mode'); if (b) setMode(b.dataset.mode); });
    radioKeys(els.levels, '.level', 'level', setLevel);
    radioKeys(els.modes, '.mode', 'mode', setMode);
    els.newChat.addEventListener('click', resetConversation);
    els.suggestions.addEventListener('click', (e) => {
      const b = e.target.closest('.chip');
      if (!b) return;
      const s = SUGGESTIONS[Number(b.dataset.index)];
      if (s.send) send(s.send);
      else { els.input.value = s.prefill; autoGrow(); els.input.focus(); els.input.setSelectionRange(s.prefill.length, s.prefill.length); }
    });
  }

  // ---------- Démarrage ----------
  async function init() {
    renderLevels();
    els.suggestions.innerHTML = SUGGESTIONS.map((s, i) => `<button type="button" class="chip" data-index="${i}">${escapeHtml(s.label)}</button>`).join('');
    bindEvents();

    try {
      const res = await fetch('/api/config');
      if (!res.ok) throw new Error();
      state.config = await res.json();
    } catch {
      state.config = null;
    }
    if (!LEVEL_INFO[state.level]) state.level = 'agent';
    if (!MODE_LABEL[state.mode]) state.mode = 'assistant';
    if (!levelAvailable(state.level)) state.level = 'nlp';

    syncSettings();
    idleStatus();
    state.transcript.forEach(renderItem);
    els.input.focus();
  }

  init();
}());
