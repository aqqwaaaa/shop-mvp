// frontend/app.js (clean + fixed + polished)
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

// Helper: format prices nicely
const fmtPrice = n => {
  const num = Number(n);
  return Number.isFinite(num) ? num.toFixed(2) : '0.00';
};

// ---------------------- Skeleton Loaders ---------------------- //
function showSkeletons(container, count = 6) {
  const skeletonHTML = Array.from({ length: count }).map(() => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton skeleton-line" style="width: 70%;"></div>
      <div class="skeleton skeleton-line" style="width: 50%;"></div>
      <div class="skeleton skeleton-line" style="width: 40%;"></div>
    </div>
  `).join('');
  container.innerHTML = skeletonHTML;
}


// ---------------------- Dark Mode Toggle + Toast ---------------------- //
const themeToggle = document.getElementById('themeToggle');

// Create toast container
function showToast(msg, type = '') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 50);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 2200);
}


// Load saved theme or default to system
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme);
  themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
} else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.documentElement.setAttribute('data-theme', 'dark');
  themeToggle.textContent = '☀️';
}

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    showToast(newTheme === 'dark' ? '🌙 Dark mode enabled' : '☀️ Light mode enabled');
  });
}


// ---------------------- Load categories ---------------------- //
async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    categories = await res.json();
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
    // show loading skeletons
    showSkeletons(itemsContainer, 8);

    const res = await fetch('/api/items');
    items = await res.json();

    items = items.filter(it => it && it.name && !/Product_Name/i.test(it.name));
    items.forEach(it => { it.price = Number(it.price) || 0; });
    filteredItems = items.slice();

    // small delay for realism
    setTimeout(() => showItems(filteredItems), 300);
  } catch (err) {
    console.error('Error loading items:', err);
    itemsContainer.innerHTML = '<p style="color:var(--muted)">Failed to load products.</p>';
  }
}



// ---------------------- Show items ---------------------- //
function showItems(list) {
  itemsContainer.innerHTML = list.map(item => {
    const categoryKeyword = encodeURIComponent(item.category || 'shopping');
    return `
      <div class="item-card card">
        <img src="${item.image_url || `https://picsum.photos/300?${categoryKeyword}&random=${item.id}`}"
             alt="${item.name}" class="item-img" />
        <h3>${item.name}</h3>
        <span class="category-tag ${(item.category||'other').toLowerCase().replace(/\s/g,'-')}">
          ${item.category || 'Other'}
        </span>
        <p class="price">₱${fmtPrice(item.price)}</p>
        <button class="btn" onclick="addToCart(${item.id})">Add to Cart</button>
      </div>
    `;
  }).join('');
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
    clearCartBtn.classList.add('btn-ghost');
    setTimeout(() => clearCartBtn.classList.remove('btn-ghost'), 200);
  });
}

// ---------------------- Checkout modal utilities ---------------------- //
let checkoutModalEl = null;

function createCheckoutModal() {
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

  document.getElementById('checkout-close').addEventListener('click', closeCheckoutModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeCheckoutModal();
  });

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
  showPurchaseComplete(); //  triggers animation after closing QR modal
}


// ---------------------- Add Checkout button (in-cart) ---------------------- //
let currentCheckoutBtn = null;

function createCheckoutButtonIfNeeded() {
  if (currentCheckoutBtn) currentCheckoutBtn.remove();
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
  cartContainer.appendChild(btn);
}

// ---------------------- Checkout handler ---------------------- //
async function handleCheckoutClick() {
  if (!cart.length) return alert('Cart is empty');
  try {
    const cartIds = cart.map(c => c.id);
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart: cartIds })
    });
    if (!res.ok) throw new Error('Checkout failed');
    const data = await res.json();
// data: { session_id, checkoutUrl, qrDataUrl, total }
showCheckoutModal({ qrDataUrl: data.qrDataUrl, checkoutUrl: data.checkoutUrl, total: data.total });

//  Success toast
showToast(' Checkout QR ready — scan to pay', 'success');


  } catch (err) {
    console.error('Checkout error:', err);
    alert('Checkout failed. See console for details.');
  }
}

// ---------------------- Update cart UI + total ---------------------- //
function updateCart() {
  // Empty cart case early
  if (!cart.length) {
    cartContainer.innerHTML = '<p style="color:var(--muted)">Your cart is empty — add items to get started.</p>';
    totalDisplay.textContent = '0.00';
    return;
  }

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


const cartCountEl = document.getElementById('cartCount');
if (cartCountEl) {
  const count = cart.reduce((sum, c) => sum + c.qty, 0);
  if (count > 0) {
    cartCountEl.textContent = count;
    cartCountEl.style.display = 'inline-flex';
    cartCountEl.classList.add('bump');
    setTimeout(() => cartCountEl.classList.remove('bump'), 400);
  } else {
    cartCountEl.style.display = 'none';
  }
}


  });

  createCheckoutButtonIfNeeded();

  const total = cart.reduce((sum, c) => sum + (Number(c.price) || 0) * c.qty, 0);
  totalDisplay.textContent = total.toFixed(2);

  totalDisplay.classList.add('total-bounce');
  setTimeout(() => totalDisplay.classList.remove('total-bounce'), 420);

  showCartRecommendations();
}

// ---------------------- Show recommendations ---------------------- //
async function showCartRecommendations() {
  if (!recContainer) return;
  if (cart.length === 0) {
    recContainer.innerHTML = '<p style="color:var(--muted)">Add something to your cart to get recommendations!</p>';
    return;
  }

  const cartIds = cart.map(c => c.id);
  try {
    showSkeletons(recContainer, 4);
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
        <img src="${r.image_url || `https://picsum.photos/300?${encodeURIComponent(r.category || 'shopping')}&random=${r.id}`}" 
             alt="${r.name}" class="item-img" />
        <h3>${r.name}</h3>
        <span class="category-tag ${(r.category||'other').toLowerCase().replace(/\s/g,'-')}">${r.category || 'Other'}</span>
        <p class="price">₱${fmtPrice(r.price)}</p>
        <button class="btn" onclick="addToCart(${r.id})">Add to Cart</button>
      </div>
    `).join('');

    recContainer.querySelectorAll('.item-card').forEach((el, i) => {
      el.style.animationDelay = `${i * 0.04}s`;
    });
  } catch (err) {
    console.error('Error loading recommendations:', err);
    recContainer.innerHTML = '<p style="color:var(--muted)">Error loading recommendations.</p>';
  }
}


// ---------------------- Purchase Complete Animation ---------------------- //
// ---------------------- Purchase Complete Animation + Cart Reset ---------------------- //
function showPurchaseComplete() {
  const overlay = document.createElement('div');
  overlay.className = 'purchase-overlay';

  overlay.innerHTML = `
    <div class="purchase-box">
      <div class="purchase-check"></div>
      <div class="purchase-text">Purchase Complete!</div>
    </div>
  `;

  document.body.appendChild(overlay);

  // optional confetti 🎉
  setTimeout(() => launchConfetti(), 400);

  // auto-remove after 3 seconds + reset cart
  setTimeout(() => {
    overlay.style.opacity = 0;
    setTimeout(() => {
      overlay.remove();
      //  Clear cart after animation
      cart = [];
      updateCart();
      showToast('🛒 Cart cleared after purchase', 'success');
    }, 400);
  }, 3000);
}


// optional confetti burst
function launchConfetti() {
  const count = 60;
  for (let i = 0; i < count; i++) {
    const conf = document.createElement('div');
    conf.style.position = 'fixed';
    conf.style.width = '8px';
    conf.style.height = '8px';
    conf.style.borderRadius = '50%';
    conf.style.background = `hsl(${Math.random() * 360}, 90%, 60%)`;
    conf.style.left = `${Math.random() * 100}%`;
    conf.style.top = '50%';
    conf.style.opacity = 1;
    conf.style.zIndex = 10000;
    conf.style.transition = 'all 1.2s ease-out';
    document.body.appendChild(conf);

    setTimeout(() => {
      conf.style.top = `${90 + Math.random() * 10}%`;
      conf.style.opacity = 0;
      conf.style.transform = `translateY(-${Math.random() * 200}px) rotate(${Math.random() * 360}deg)`;
    }, 20);

    setTimeout(() => conf.remove(), 1500);
  }
}

// ---------------------- Search and filter ---------------------- //
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

// Debounce search input
if (searchInput) {
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(applyFilters, 200);
  });
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      applyFilters();
    }
  });
}
if (categoryFilter) categoryFilter.addEventListener('change', applyFilters);

// ---------------------- Init ---------------------- //
console.log('🟢 Frontend loaded');
Promise.all([loadCategories(), loadItems()]);
