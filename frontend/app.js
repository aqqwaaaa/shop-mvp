
const itemsContainer = document.getElementById('items');
const categoryFilter = document.getElementById('categoryFilter');
const cartContainer = document.getElementById('cart');
const totalDisplay = document.getElementById('total');
const recContainer = document.getElementById('recommendations');

let items = [];
let cart = [];
let categories = [];

// --- Load categories --- //
async function loadCategories() {
  const res = await fetch('/api/categories');
  categories = await res.json();
  categoryFilter.innerHTML = `
    <option value="all">All</option>
    ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
  `;
}

// --- Load items --- //
async function loadItems() {
  const res = await fetch('/api/items');
  items = await res.json();
  showItems(items);
}

async function loadTopRecommendations() {
  const res = await fetch('/api/recommendations/top?category=1&n=3');
  const top = await res.json();
  console.log('Top products in category 1:', top);
}
loadTopRecommendations();


// --- Show items --- //
function showItems(list) {
  itemsContainer.innerHTML = list.map(item => `
    <div class="card">
      <h3>${item.name}</h3>
      <p>Category: ${item.category}</p>
      <p>Price: $${item.price}</p>
      <button onclick="addToCart(${item.id})">Add to Cart</button>
    </div>
  `).join('');
}

// --- Add to cart --- //
function addToCart(id) {
  const item = items.find(i => i.id === id);
  const existing = cart.find(c => c.id === id);
  if (existing) existing.qty++;
  else cart.push({ ...item, qty: 1 });
  updateCart();
}

// --- Remove from cart --- //
function removeFromCart(id) {
  cart = cart.filter(c => c.id !== id);
  updateCart();
}

// --- Update cart UI + total --- //
function updateCart() {
  cartContainer.innerHTML = cart.map(c => `
    <div class="cart-item">
      ${c.name} (x${c.qty}) - $${(c.price * c.qty).toFixed(2)}
      <button onclick="removeFromCart(${c.id})">Remove</button>
    </div>
  `).join('');

  const total = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  totalDisplay.textContent = total.toFixed(2);

  showCartRecommendations();
}

// --- Show recommendations --- //
async function showCartRecommendations() {
  if (cart.length === 0) {
    recContainer.innerHTML = '<p>Add something to your cart to get recommendations!</p>';
    return;
  }

  const cartIds = cart.map(c => c.id);
  const res = await fetch('/api/recommendations/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cart: cartIds })
  });
  const recs = await res.json();

  if (recs.length === 0) {
    recContainer.innerHTML = '<p>No recommendations available.</p>';
  } else {
    recContainer.innerHTML = recs.map(r => `
      <div class="card">
        <h3>${r.name}</h3>
        <p>Price: $${r.price}</p>
        <button onclick="addToCart(${r.id})">Add to Cart</button>
      </div>
    `).join('');
  }
}

// --- Filter by category --- //
categoryFilter.addEventListener('change', () => {
  const value = categoryFilter.value;
  if (value === 'all') showItems(items);
  else showItems(items.filter(i => i.category_id == value));
});

// --- Initialize --- //
loadCategories();
loadItems();
