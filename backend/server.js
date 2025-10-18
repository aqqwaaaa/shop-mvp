const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to database
const dbPath = path.join(__dirname, '../database/shop.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('❌ Database connection error:', err.message);
  else console.log('✅ Connected to SQLite database');
});

// --- 1️⃣ GET /api/items --- //
app.get('/api/items', (req, res) => {
  db.all(
    'SELECT products.id, products.name, products.price, categories.name AS category FROM products JOIN categories ON products.category_id = categories.id;',
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// --- 2️⃣ GET /api/categories --- //
app.get('/api/categories', (req, res) => {
  db.all('SELECT * FROM categories;', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// --- 3️⃣ GET /api/recommendations/top?category=1&n=5 --- //
app.get('/api/recommendations/top', (req, res) => {
  const categoryId = req.query.category;
  const limit = parseInt(req.query.n) || 5;
  const sql = `
    SELECT p.*, COUNT(oi.product_id) AS purchase_count
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE p.category_id = ?
    GROUP BY oi.product_id
    ORDER BY purchase_count DESC
    LIMIT ?;
  `;
  db.all(sql, [categoryId, limit], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// --- 4️⃣ POST /api/recommendations/cart --- //
app.post('/api/recommendations/cart', (req, res) => {
  const { cart } = req.body;
  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ error: 'Invalid cart data' });
  }

  const placeholders = cart.map(() => '?').join(',');
  const sql = `
    SELECT DISTINCT p.*
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id IN (
      SELECT order_id FROM order_items WHERE product_id IN (${placeholders})
    )
    AND p.id NOT IN (${placeholders})
    LIMIT 5;
  `;
  db.all(sql, [...cart, ...cart], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// --- 5️⃣ Serve static files (frontend) --- //
app.use(express.static(path.join(__dirname, '../frontend')));

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
