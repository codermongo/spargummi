/* ═══════════════════════════════════════════════════
   SUGGESTION PAGE — Main JavaScript
   ═══════════════════════════════════════════════════ */

'use strict';

// ── Appwrite Config ──────────────────────────────────
const AW = {
  endpoint:   'https://api.netpurple.net/v1',
  projectId:  '699f23920000d9667d3e',
  dbId:       '699f251000346ad6c5e7',
  colId:      'db_spargummi',

  headers() {
    return {
      'Content-Type':     'application/json',
      'X-Appwrite-Project': this.projectId,
    };
  },

  async listDocuments(queries = []) {
    const params = new URLSearchParams();
    queries.forEach(q => params.append('queries[]', q));
    const url = `${this.endpoint}/databases/${this.dbId}/collections/${this.colId}/documents?${params}`;
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async createDocument(data) {
    const url = `${this.endpoint}/databases/${this.dbId}/collections/${this.colId}/documents`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ documentId: 'unique()', data }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  },
};

// ── DOM references ────────────────────────────────────
const els = {
  sgGrid:      document.getElementById('sgGrid'),
  sgLoading:   document.getElementById('sgLoading'),
  sgEmpty:     document.getElementById('sgEmpty'),
  sgError:     document.getElementById('sgError'),
  sgErrorMsg:  document.getElementById('sgErrorMsg'),
  retryBtn:    document.getElementById('retryBtn'),
  openFormBtn: document.getElementById('openFormBtn'),
  emptyFormBtn:document.getElementById('emptyFormBtn'),
  modalOverlay:document.getElementById('modalOverlay'),
  modal:       document.getElementById('modal'),
  modalClose:  document.getElementById('modalClose'),
  sgForm:      document.getElementById('sgForm'),
  fieldTitle:  document.getElementById('fieldTitle'),
  fieldDesc:   document.getElementById('fieldDescription'),
  fieldCat:    document.getElementById('fieldCategory'),
  formFeedback:document.getElementById('formFeedback'),
  submitBtn:   document.getElementById('submitBtn'),
  toasts:      document.getElementById('toastContainer'),
  hamburger:   document.getElementById('hamburger'),
  nav:         document.getElementById('nav'),
};

// ── State helpers ─────────────────────────────────────
function showState(name) {
  const states = ['sgLoading', 'sgEmpty', 'sgError', 'sgGrid'];
  states.forEach(id => {
    const el = els[id];
    if (!el) return;
    if (id === name) {
      el.hidden = false;
    } else {
      el.hidden = true;
    }
  });
}

// ── Format date in German locale ──────────────────────
function formatDate(isoString) {
  try {
    return new Date(isoString).toLocaleDateString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return '';
  }
}

// ── HTML escape ───────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Render one card ───────────────────────────────────
function createCard(doc) {
  const card = document.createElement('article');
  card.className = 'sg-card';
  card.setAttribute('aria-label', doc.title || 'Vorschlag');

  const hasTitle    = doc.title && doc.title.trim();
  const hasCategory = doc.category && doc.category.trim();
  const date        = formatDate(doc.$createdAt);

  card.innerHTML = `
    <div class="sg-card__header">
      ${hasCategory ? `<span class="sg-card__category">${esc(doc.category)}</span>` : '<span></span>'}
      ${date ? `<time class="sg-card__date" datetime="${esc(doc.$createdAt)}">${esc(date)}</time>` : ''}
    </div>
    ${hasTitle ? `<h2 class="sg-card__title">${esc(doc.title)}</h2>` : ''}
    <p class="sg-card__desc">${esc(doc.description)}</p>
  `;

  return card;
}

// ── Load suggestions ──────────────────────────────────
async function loadSuggestions() {
  showState('sgLoading');
  try {
    const result = await AW.listDocuments(['orderDesc("$createdAt")', 'limit(100)']);
    const docs = result.documents || [];

    if (docs.length === 0) {
      showState('sgEmpty');
      return;
    }

    els.sgGrid.innerHTML = '';
    docs.forEach((doc, i) => {
      const card = createCard(doc);
      card.style.animationDelay = `${i * 40}ms`;
      els.sgGrid.appendChild(card);
    });

    showState('sgGrid');
  } catch (err) {
    console.error('[Suggestion] load error:', err);
    els.sgErrorMsg.textContent = 'Vorschläge konnten nicht geladen werden. Bitte versuche es später erneut.';
    showState('sgError');
  }
}

// ── Modal open / close ────────────────────────────────
function openModal() {
  els.modal.hidden = false;
  els.modalOverlay.hidden = false;
  requestAnimationFrame(() => {
    els.modal.classList.add('open');
    els.modalOverlay.classList.add('open');
  });
  els.modal.setAttribute('aria-hidden', 'false');
  els.modalOverlay.setAttribute('aria-hidden', 'false');
  els.fieldTitle.focus();
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  els.modal.classList.remove('open');
  els.modalOverlay.classList.remove('open');
  els.modal.setAttribute('aria-hidden', 'true');
  els.modalOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  clearFeedback();
}

function clearFeedback() {
  els.formFeedback.textContent = '';
  els.formFeedback.className = 'form-feedback';
}

function showFeedback(msg, type = 'error') {
  els.formFeedback.textContent = msg;
  els.formFeedback.className = `form-feedback ${type}`;
}

// ── Toast notifications ───────────────────────────────
function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true" width="16" height="16">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
    ${esc(msg)}
  `;
  els.toasts.appendChild(t);
  setTimeout(() => {
    t.classList.add('toast--out');
    setTimeout(() => t.remove(), 200);
  }, 3000);
}

// ── Form submission ───────────────────────────────────
async function handleSubmit(e) {
  e.preventDefault();
  clearFeedback();

  const description = els.fieldDesc.value.trim();
  if (!description) {
    showFeedback('Bitte gib eine Beschreibung ein.');
    els.fieldDesc.focus();
    return;
  }

  const data = { description };

  const title = els.fieldTitle.value.trim();
  if (title) data.title = title;

  const category = els.fieldCat.value;
  if (category) data.category = category;

  els.submitBtn.classList.add('loading');
  els.submitBtn.textContent = 'Wird eingereicht…';

  try {
    const doc = await AW.createDocument(data);

    // Prepend new card at top of grid
    const card = createCard(doc);
    if (els.sgGrid.firstChild) {
      els.sgGrid.insertBefore(card, els.sgGrid.firstChild);
    } else {
      els.sgGrid.appendChild(card);
    }
    showState('sgGrid');

    els.sgForm.reset();
    closeModal();
    showToast('Vorschlag erfolgreich eingereicht!');
  } catch (err) {
    console.error('[Suggestion] create error:', err);
    showFeedback(err.message || 'Es ist ein Fehler aufgetreten. Bitte versuche es erneut.');
  } finally {
    els.submitBtn.classList.remove('loading');
    els.submitBtn.textContent = 'Einreichen';
  }
}

// ── Hamburger menu ────────────────────────────────────
function initHamburger() {
  els.hamburger.addEventListener('click', () => {
    const open = els.hamburger.classList.toggle('open');
    els.nav.classList.toggle('nav--open', open);
    els.hamburger.setAttribute('aria-expanded', String(open));
  });
}

// ── Header scroll shadow ──────────────────────────────
function initHeaderScroll() {
  const header = document.getElementById('header');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
}

// ── Event bindings ────────────────────────────────────
function bindEvents() {
  els.openFormBtn.addEventListener('click', openModal);
  els.emptyFormBtn.addEventListener('click', openModal);
  els.modalClose.addEventListener('click', closeModal);
  els.modalOverlay.addEventListener('click', closeModal);
  els.retryBtn.addEventListener('click', loadSuggestions);
  els.sgForm.addEventListener('submit', handleSubmit);

  // Close modal on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && els.modal.classList.contains('open')) closeModal();
  });
}

// ── Init ──────────────────────────────────────────────
bindEvents();
initHamburger();
initHeaderScroll();
loadSuggestions();
