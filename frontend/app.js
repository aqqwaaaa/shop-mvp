// frontend/app.js (with Checkout QR flow)
const itemsContainer = document.getElementById('items');
const categoryFilter = document.getElementById('categoryFilter');
const cartContainer = document.getElementById('cart');
const totalDisplay = document.getElementById('total');
const recContainer = document.getElementById('recommendations');
const searchInput = document.getElementById('searchInput');
const clearCartBtn = document.getElementById('clearCartBtn');

let items = [];
let cart = [];
let categories = [];
let filteredItems = [];

// small helper
const fmtPrice = n => {
  const num = Number(n);
  return Number.isFinite(num) ? num.toFixed(2) : '0.00';
};

// ---------------------- Load categories ---------------------- //
async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    categories = await res.json();
    // populate categoryFilter
    if (categoryFilter) {
      categoryFilter.innerHTML = `<option value="all">All</option>` +
        categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    }
  } catch (err) {
    console.error('Error loading categories:', err);
  }
}

// ---------------------- Load items ---------------------- //
async function loadItems() {
  try {
    const res = await fetch('/api/items');
    items = await res.json();
    // remove any accidental header-like rows where name or price is not valid
    items = items.filter(it => it && it.name && !/Product_Name/i.test(it.name));
    // ensure numeric price
    items.forEach(it => { it.price = Number(it.price) || 0; });
    filteredItems = items.slice();
    showItems(filteredItems);
  } catch (err) {
    console.error('Error loading items:', err);
    items = [];
    filteredItems = [];
    itemsContainer.innerHTML = '<p style="color:var(--muted)">Failed to load products.</p>';
  }
}

// ---------------------- Show items ---------------------- //
function showItems(list) {
  itemsContainer.innerHTML = list.map(item => `
    <div class="item-card card">
      <img src="${item.image_url || 'https://cdn-icons-png.flaticon.com/512/679/679720.png'}" alt="${item.name}" class="item-img" />
      <h3>${item.name}</h3>
      <span class="category-tag ${(item.category||'other').toLowerCase().replace(/\s/g,'-')}">
        ${item.category || 'Other'}
      </span>
      <p class="price">₱${fmtPrice(item.price)}</p>
      <button class="btn" onclick="addToCart(${item.id})">Add to Cart</button>
    </div>
  `).join('');
}

// ---------------------- Cart operations ---------------------- //
function addToCart(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  const existing = cart.find(c => c.id === id);
  if (existing) existing.qty++;
  else cart.push({ id: item.id, name: item.name, price: item.price, qty: 1, category: item.category, image_url: item.image_url });
  updateCart();
}

function removeFromCart(id) {
  cart = cart.filter(c => c.id !== id);
  updateCart();
}

function clearCart() {
  cart = [];
  updateCart();
}

// Attach Clear Cart button
if (clearCartBtn) {
  clearCartBtn.addEventListener('click', () => {
    clearCart();
    // small visual feedback
    clearCartBtn.classList.add('btn-ghost');
    setTimeout(() => clearCartBtn.classList.remove('btn-ghost'), 200);
  });
}

// ---------------------- Checkout modal utilities ---------------------- //
let checkoutModalEl = null;

function createCheckoutModal() {
  // avoid recreating
  if (checkoutModalEl) return checkoutModalEl;

  const overlay = document.createElement('div');
  overlay.id = 'checkout-modal';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = 'rgba(0,0,0,0.45)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '9999';

  const box = document.createElement('div');
  box.style.width = '320px';
  box.style.maxWidth = '92%';
  box.style.background = '#fff';
  box.style.borderRadius = '12px';
  box.style.padding = '16px';
  box.style.boxShadow = '0 8px 30px rgba(0,0,0,0.2)';
  box.style.textAlign = 'center';

  box.innerHTML = `
    <div id="checkout-content">
      <h3 style="margin:0 0 8px 0;">Checkout — Scan to Pay</h3>
      <div id="checkout-qr" style="margin:10px 0;"></div>
      <div id="checkout-link" style="font-size:0.9rem; color:#333; word-break:break-all; margin-top:8px;"></div>
      <div style="margin-top:12px;">
        <button id="checkout-close" class="btn btn-ghost">Close</button>
      </div>
    </div>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);
  checkoutModalEl = overlay;

  // close events
  document.getElementById('checkout-close').addEventListener('click', closeCheckoutModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeCheckoutModal();
  });

  // ESC to close
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && checkoutModalEl) closeCheckoutModal();
  });

  return checkoutModalEl;
}

function showCheckoutModal({ qrDataUrl, checkoutUrl, total }) {
  const modal = createCheckoutModal();
  const qrEl = modal.querySelector('#checkout-qr');
  const linkEl = modal.querySelector('#checkout-link');

  if (qrDataUrl) {
    qrEl.innerHTML = `<img src="${qrDataUrl}" alt="checkout-qr" style="width:220px;height:220px;object-fit:contain;border-radius:6px;" />`;
  } else {
    qrEl.innerHTML = `<div style="padding:20px;color:#666">QR not available</div>`;
  }

  linkEl.innerHTML = `<div style="margin-bottom:6px;"><strong>Total: ₱${fmtPrice(total)}</strong></div>
    <a href="${checkoutUrl}" target="_blank" rel="noopener noreferrer">${checkoutUrl}</a>`;

  modal.style.display = 'flex';
}

function closeCheckoutModal() {
  if (!checkoutModalEl) return;
  checkoutModalEl.style.display = 'none';
  const qrEl = checkoutModalEl.querySelector('#checkout-qr');
  if (qrEl) qrEl.innerHTML = '';
  const linkEl = checkoutModalEl.querySelector('#checkout-link');
  if (linkEl) linkEl.innerHTML = '';
}

// ---------------------- Add Checkout button (in-cart) ---------------------- //
let currentCheckoutBtn = null;

function createCheckoutButtonIfNeeded() {
  // remove old button if exists
  if (currentCheckoutBtn) currentCheckoutBtn.remove();
  // only show if cart has items
  if (!cart.length) {
    currentCheckoutBtn = null;
    return;
  }

  const btn = document.createElement('button');
  btn.className = 'btn';
  btn.textContent = 'Checkout (QR)';
  btn.style.marginTop = '10px';
  btn.onclick = handleCheckoutClick;
  currentCheckoutBtn = btn;

  // append at bottom of cartContainer
  cartContainer.appendChild(btn);
}

// Handler: POST /api/checkout and show modal with QR
async function handleCheckoutClick() {
  if (!cart.length) {
    alert('Cart is empty');
    return;
  }
  try {
    const cartIds = cart.map(c => c.id);
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart: cartIds })
    });

    if (!res.ok) {
      const err = await res.json().catch(()=>null);
      console.error('Checkout create failed', err || res.statusText);
      alert('Failed to create checkout session');
      return;
    }

    const data = await res.json();
    // data: { session_id, checkoutUrl, qrDataUrl, total }
    showCheckoutModal({ qrDataUrl: data.qrDataUrl, checkoutUrl: data.checkoutUrl, total: data.total });
  } catch (err) {
    console.error('Checkout error:', err);
    alert('Checkout failed. See console for details.');
  }
}

// ---------------------- Update cart UI + total ---------------------- //
function updateCart() {
  cartContainer.innerHTML = '';
  cart.forEach(c => {
    const div = document.createElement('div');
    div.className = 'cart-item fade-in';
    div.innerHTML = `
      <div>
        <div class="name">${c.name}</div>
        <div class="qty">x${c.qty} • ₱${fmtPrice(c.price * c.qty)}</div>
      </div>
      <div>
        <button class="btn btn-ghost" onclick="removeFromCart(${c.id})">Remove</button>
      </div>
    `;
    cartContainer.appendChild(div);
    setTimeout(() => div.classList.add('added'), 80);
  });

  // Add Checkout button (if cart not empty)
  createCheckoutButtonIfNeeded();

  const total = cart.reduce((sum, c) => sum + (Number(c.price) || 0) * c.qty, 0);
  totalDisplay.textContent = total.toFixed(2);

  // bounce
  totalDisplay.classList.add('total-bounce');
  setTimeout(() => totalDisplay.classList.remove('total-bounce'), 420);

  // Refresh recommendations
  showCartRecommendations();

  // If cart empty, show nice placeholder in cart area
  if (!cart.length) {
    cartContainer.innerHTML = '<p style="color:var(--muted)">Your cart is empty — add items to get started.</p>';
  }
}

// ---------------------- Show recommendations based on cart ---------------------- //
async function showCartRecommendations() {
  if (!recContainer) return;
  if (cart.length === 0) {
    recContainer.innerHTML = '<p style="color:var(--muted)">Add something to your cart to get recommendations!</p>';
    return;
  }

  const cartIds = cart.map(c => c.id);
  try {
    const res = await fetch('/api/recommendations/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart: cartIds, n: 6 })
    });
    const recs = await res.json();

    if (!recs || recs.length === 0) {
      recContainer.innerHTML = '<p style="color:var(--muted)">No recommendations available.</p>';
      return;
    }

    recContainer.innerHTML = recs.map(r => `
      <div class="item-card card">
        <img src="${r.image_url || 'https://cdn-icons-png.flaticon.com/512/679/679720.png'}" alt="${r.name}" class="item-img" />
        <h3>${r.name}</h3>
        <span class="category-tag ${(r.category||'other').toLowerCase().replace(/\s/g,'-')}">${r.category || 'Other'}</span>
        <p class="price">₱${fmtPrice(r.price)}</p>
        <button class="btn" onclick="addToCart(${r.id})">Add to Cart</button>
      </div>
    `).join('');

    // small staggered reveal
    recContainer.querySelectorAll('.item-card').forEach((el, i) => {
      el.style.animationDelay = `${i * 0.04}s`;
    });

  } catch (err) {
    console.error('Error loading recommendations:', err);
    recContainer.innerHTML = '<p style="color:var(--muted)">Error loading recommendations.</p>';
  }
}

// ---------------------- Search and filter logic ---------------------- //
function applyFilters() {
  const q = (searchInput && searchInput.value || '').trim().toLowerCase();
  const cat = (categoryFilter && categoryFilter.value) || 'all';

  filteredItems = items.filter(it => {
    const name = (it.name || '').toLowerCase();
    const category = (it.category || '').toLowerCase();
    const matchesQuery = !q || name.includes(q) || category.includes(q);
    const matchesCategory = (cat === 'all') || (it.category === cat);
    return matchesQuery && matchesCategory;
  });

  showItems(filteredItems);
}

// events
if (categoryFilter) categoryFilter.addEventListener('change', applyFilters);
if (searchInput) {
  searchInput.addEventListener('input', () => {
    applyFilters();
  });
  // optional: press ESC to clear
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      applyFilters();
    }
  });
}

// ---------------------- Initialize ---------------------- //
console.log('🟢 Frontend loaded');
loadCategories();
loadItems();
