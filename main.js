/* ═══════════════════════════════════════════════════
   SPARGUMMI — Main JavaScript
   ═══════════════════════════════════════════════════ */

'use strict';

// ── Cart State ──────────────────────────────────────
const cart = {
  items: [],

  add(name, price) {
    const existing = this.items.find(i => i.name === name);
    if (existing) {
      existing.qty++;
    } else {
      this.items.push({ name, price: parseFloat(price), qty: 1 });
    }
    this.persist();
    UI.renderCart();
    UI.updateCartCount();
  },

  remove(name) {
    this.items = this.items.filter(i => i.name !== name);
    this.persist();
    UI.renderCart();
    UI.updateCartCount();
  },

  setQty(name, qty) {
    if (qty < 1) { this.remove(name); return; }
    const item = this.items.find(i => i.name === name);
    if (item) { item.qty = qty; }
    this.persist();
    UI.renderCart();
    UI.updateCartCount();
  },

  get total() {
    return this.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  },

  get count() {
    return this.items.reduce((sum, i) => sum + i.qty, 0);
  },

  persist() {
    clearTimeout(this._persistTimer);
    this._persistTimer = setTimeout(() => {
      try {
        localStorage.setItem('spargummi_cart', JSON.stringify(this.items));
      } catch (_) { /* storage unavailable */ }
    }, 300);
  },

  restore() {
    try {
      const saved = localStorage.getItem('spargummi_cart');
      if (saved) this.items = JSON.parse(saved);
    } catch (_) { /* storage unavailable */ }
  }
};

// ── UI Helpers ──────────────────────────────────────
const UI = {
  els: {},
  _itemEls: new Map(),

  init() {
    this.els = {
      header:       document.getElementById('header'),
      cartBtn:      document.getElementById('cartBtn'),
      cartCount:    document.getElementById('cartCount'),
      cartDrawer:   document.getElementById('cartDrawer'),
      cartOverlay:  document.getElementById('cartOverlay'),
      cartClose:    document.getElementById('cartClose'),
      cartItems:    document.getElementById('cartItems'),
      cartEmpty:    document.getElementById('cartEmpty'),
      cartFooter:   document.getElementById('cartFooter'),
      cartTotal:    document.getElementById('cartTotal'),
      cartShopLink: document.getElementById('cartShopLink'),
      hamburger:    document.getElementById('hamburger'),
      nav:          document.getElementById('nav'),
      contactForm:  document.getElementById('contactForm'),
      formFeedback: document.getElementById('formFeedback'),
      toastContainer: document.getElementById('toastContainer'),
    };
  },

  updateCartCount() {
    const { cartCount, cartBtn } = this.els;
    const count = cart.count;
    cartCount.textContent = count;
    cartCount.classList.toggle('visible', count > 0);
    // bump animation — double rAF avoids synchronous reflow
    if (count > 0) {
      cartBtn.classList.remove('bump');
      requestAnimationFrame(() => requestAnimationFrame(() => cartBtn.classList.add('bump')));
    }
  },

  renderCart() {
    const { cartItems, cartEmpty, cartFooter, cartTotal } = this.els;

    if (cart.items.length === 0) {
      cartEmpty.style.display = '';
      cartFooter.style.display = 'none';
      this._itemEls.forEach(el => el.remove());
      this._itemEls.clear();
      return;
    }

    cartEmpty.style.display = 'none';
    cartFooter.style.display = '';

    // Remove items no longer in cart
    const cartNames = new Set(cart.items.map(i => i.name));
    this._itemEls.forEach((el, name) => {
      if (!cartNames.has(name)) {
        el.remove();
        this._itemEls.delete(name);
      }
    });

    // Add / update items using cached Map — no DOM queries needed
    cart.items.forEach(item => {
      let el = this._itemEls.get(item.name);
      if (!el) {
        el = this.createCartItemEl(item);
        cartItems.appendChild(el);
        this._itemEls.set(item.name, el);
      } else {
        el.querySelector('.cart-item__qty-num').textContent = item.qty;
        el.querySelector('.cart-item__price').textContent = formatPrice(item.price * item.qty);
      }
    });

    cartTotal.textContent = formatPrice(cart.total);
  },

  createCartItemEl(item) {
    const el = document.createElement('div');
    el.className = 'cart-item';
    el.dataset.name = item.name;
    el.innerHTML = `
      <div class="cart-item__info">
        <div class="cart-item__name">${escapeHTML(item.name)}</div>
        <div class="cart-item__price">${formatPrice(item.price * item.qty)}</div>
      </div>
      <div class="cart-item__qty">
        <button class="cart-item__qty-btn" data-action="dec" aria-label="Decrease quantity">−</button>
        <span class="cart-item__qty-num" aria-live="polite">${item.qty}</span>
        <button class="cart-item__qty-btn" data-action="inc" aria-label="Increase quantity">+</button>
      </div>
    `;
    el.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const current = cart.items.find(i => i.name === item.name);
        if (!current) return;
        const delta = btn.dataset.action === 'inc' ? 1 : -1;
        cart.setQty(item.name, current.qty + delta);
      });
    });
    return el;
  },

  openCart() {
    const { cartDrawer, cartOverlay } = this.els;
    cartDrawer.classList.add('open');
    cartDrawer.setAttribute('aria-hidden', 'false');
    cartOverlay.classList.add('open');
    cartOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    // Focus close button
    setTimeout(() => this.els.cartClose.focus(), 50);
  },

  closeCart() {
    const { cartDrawer, cartOverlay } = this.els;
    cartDrawer.classList.remove('open');
    cartDrawer.setAttribute('aria-hidden', 'true');
    cartOverlay.classList.remove('open');
    cartOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    this.els.cartBtn.focus();
  },

  showToast(message) {
    const { toastContainer } = this.els;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <span>${escapeHTML(message)}</span>
    `;
    toastContainer.appendChild(toast);

    const dismiss = () => {
      toast.classList.add('toast--out');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    };
    setTimeout(dismiss, 3000);
    toast.addEventListener('click', dismiss);
  }
};

// ── Utilities ───────────────────────────────────────
function formatPrice(amount) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Header Scroll Behavior ──────────────────────────
function initHeader() {
  const { header } = UI.els;
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 12);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ── Mobile Nav ──────────────────────────────────────
function initMobileNav() {
  const { hamburger, nav } = UI.els;

  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', String(isOpen));
    nav.classList.toggle('nav--open', isOpen);
  });

  // Close nav on link click
  nav.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      nav.classList.remove('nav--open');
    });
  });

  // Close nav on outside click
  document.addEventListener('click', e => {
    if (!nav.contains(e.target) && !hamburger.contains(e.target)) {
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      nav.classList.remove('nav--open');
    }
  });
}

// ── Cart Events ─────────────────────────────────────
function initCart() {
  const { cartBtn, cartClose, cartOverlay, cartShopLink } = UI.els;

  cartBtn.addEventListener('click', () => UI.openCart());
  cartClose.addEventListener('click', () => UI.closeCart());
  cartOverlay.addEventListener('click', () => UI.closeCart());

  if (cartShopLink) {
    cartShopLink.addEventListener('click', () => UI.closeCart());
  }

  // Keyboard: Escape closes cart
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') UI.closeCart();
  });

  // Focus trap inside cart drawer
  const { cartDrawer } = UI.els;
  cartDrawer.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const focusable = cartDrawer.querySelectorAll(
      'button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });
}

// ── Add-to-Cart Buttons ─────────────────────────────
function initAddToCart() {
  document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      const name  = btn.dataset.name;
      const price = btn.dataset.price;
      if (!name || !price) return;

      cart.add(name, price);

      // Visual feedback on button
      const original = btn.textContent;
      btn.textContent = '✓ Hinzugefügt';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = original;
        btn.disabled = false;
      }, 1200);

      UI.showToast(`${name} wurde hinzugefügt`);
    });
  });
}

// ── Scroll Reveal ───────────────────────────────────
function initScrollReveal() {
  const targets = document.querySelectorAll(
    '.feature-card, .product-card, .trust-badge, .faq__item, .contact__item, .stat'
  );

  targets.forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = `${(i % 4) * 60}ms`;
  });

  const observer = new IntersectionObserver(
    entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    }),
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  targets.forEach(el => observer.observe(el));
}

// ── Contact Form ────────────────────────────────────
function initContactForm() {
  const { contactForm, formFeedback } = UI.els;
  if (!contactForm) return;

  contactForm.addEventListener('submit', e => {
    e.preventDefault();

    const name    = contactForm.name.value.trim();
    const email   = contactForm.email.value.trim();
    const message = contactForm.message.value.trim();

    // Simple validation
    if (!name || !email || !message) {
      showFormFeedback('error', 'Bitte fülle alle Felder aus.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFormFeedback('error', 'Bitte gib eine gültige E-Mail-Adresse ein.');
      return;
    }

    // Simulate submission
    const submitBtn = contactForm.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Wird gesendet…';

    setTimeout(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Absenden';
      contactForm.reset();
      showFormFeedback('success', 'Vielen Dank! Wir melden uns innerhalb von 24 Stunden.');
      setTimeout(() => hideFormFeedback(), 5000);
    }, 1200);
  });

  function showFormFeedback(type, message) {
    formFeedback.textContent = message;
    formFeedback.className = `form-feedback ${type}`;
  }
  function hideFormFeedback() {
    formFeedback.className = 'form-feedback';
    formFeedback.textContent = '';
  }
}

// ── Smooth Anchor Scroll (offset for fixed header) ──
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const id = anchor.getAttribute('href').slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - getComputedStyle(document.documentElement).getPropertyValue('--header-h').trim().replace('px','') * 1 - 16;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

// ── Active Nav Link Highlight ────────────────────────
function initActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const links = document.querySelectorAll('.nav__link');

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          links.forEach(link => {
            const isActive = link.getAttribute('href') === `#${id}`;
            link.style.color = isActive ? 'var(--blue-600)' : '';
            link.style.background = isActive ? 'var(--blue-50)' : '';
          });
        }
      });
    },
    { threshold: 0.4 }
  );

  sections.forEach(section => observer.observe(section));
}

// ── Theme Toggle ────────────────────────────────────
function initThemeToggle() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;

  // Apply saved preference; default is light (no attribute)
  const saved = localStorage.getItem('spargummi_theme');
  if (saved === 'dark') document.documentElement.dataset.theme = 'dark';

  btn.addEventListener('click', () => {
    const isDark = document.documentElement.dataset.theme === 'dark';
    if (isDark) {
      delete document.documentElement.dataset.theme;
      localStorage.setItem('spargummi_theme', 'light');
    } else {
      document.documentElement.dataset.theme = 'dark';
      localStorage.setItem('spargummi_theme', 'dark');
    }
  });
}

// ── Boot ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  UI.init();
  cart.restore();

  // Critical: must run before first paint
  initThemeToggle();
  initHeader();
  initMobileNav();
  initCart();
  initAddToCart();
  UI.renderCart();
  UI.updateCartCount();

  // Non-critical: defer to next frame so browser can render first
  requestAnimationFrame(() => {
    initScrollReveal();
    initSmoothScroll();
    initActiveNav();
  });
});
