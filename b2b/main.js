'use strict';

// ── HEADER SCROLL ──
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 10);
}, { passive: true });

// ── HAMBURGER ──
const hamburger = document.getElementById('hamburger');
const nav = document.getElementById('nav');
hamburger.addEventListener('click', () => {
  const open = hamburger.classList.toggle('open');
  nav.classList.toggle('nav--open', open);
  hamburger.setAttribute('aria-expanded', open);
});

// ── CART STATE ──
let cart = [];

const cartBtn     = document.getElementById('cartBtn');
const cartCount   = document.getElementById('cartCount');
const cartOverlay = document.getElementById('cartOverlay');
const cartDrawer  = document.getElementById('cartDrawer');
const cartClose   = document.getElementById('cartClose');
const cartItems   = document.getElementById('cartItems');
const cartTotal   = document.getElementById('cartTotal');

function openCart() {
  cartDrawer.classList.add('open');
  cartOverlay.classList.add('open');
  cartOverlay.removeAttribute('aria-hidden');
  cartDrawer.focus();
}
function closeCart() {
  cartDrawer.classList.remove('open');
  cartOverlay.classList.remove('open');
  cartOverlay.setAttribute('aria-hidden', 'true');
}

cartBtn.addEventListener('click', openCart);
cartClose.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCart(); });

function updateCartUI() {
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);

  cartTotal.textContent = total.toLocaleString('de-DE') + ' €';
  cartCount.textContent = count;
  cartCount.classList.toggle('visible', count > 0);

  if (cart.length === 0) {
    cartItems.innerHTML = `<div class="cart-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
      <p>Keine Produkte angefragt.</p>
    </div>`;
    return;
  }

  cartItems.innerHTML = cart.map((item, idx) => `
    <div class="cart-item">
      <div class="cart-item__info">
        <div class="cart-item__name">${item.name}</div>
        <div class="cart-item__price">${(item.price * item.qty).toLocaleString('de-DE')} €/Person/Monat</div>
      </div>
      <div class="cart-item__qty">
        <button class="cart-item__qty-btn" data-action="dec" data-idx="${idx}" aria-label="Weniger">−</button>
        <span class="cart-item__qty-num">${item.qty}</span>
        <button class="cart-item__qty-btn" data-action="inc" data-idx="${idx}" aria-label="Mehr">+</button>
      </div>
    </div>
  `).join('');

  cartItems.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = +btn.dataset.idx;
      if (btn.dataset.action === 'inc') {
        cart[idx].qty++;
      } else {
        cart[idx].qty--;
        if (cart[idx].qty <= 0) cart.splice(idx, 1);
      }
      updateCartUI();
    });
  });
}

// ── ADD TO CART ──
document.querySelectorAll('.add-to-cart').forEach(btn => {
  btn.addEventListener('click', () => {
    const name  = btn.dataset.name;
    const price = parseInt(btn.dataset.price, 10);
    const existing = cart.find(i => i.name === name);
    if (existing) {
      existing.qty++;
    } else {
      cart.push({ name, price, qty: 1 });
    }
    updateCartUI();
    cartBtn.classList.remove('bump');
    void cartBtn.offsetWidth;
    cartBtn.classList.add('bump');
    showToast(`${name} zur Anfrage hinzugefügt`);
  });
});

// ── TOAST ──
const toastContainer = document.getElementById('toastContainer');
function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>${msg}`;
  toastContainer.appendChild(t);
  setTimeout(() => {
    t.classList.add('toast--out');
    t.addEventListener('animationend', () => t.remove());
  }, 2800);
}

// ── REVEAL ON SCROLL ──
const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); observer.unobserve(e.target); } });
}, { threshold: 0.12 });
reveals.forEach(el => observer.observe(el));
