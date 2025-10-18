// backend/server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to database
const dbPath = path.join(__dirname, '../database/shop.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('❌ Database connection error:', err.message);
  else console.log('✅ Connected to SQLite database');
});

// Create helpful indexes and checkout_sessions table if they don't exist
db.serialize(() => {
  db.run(`CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);`);

  // Create checkout_sessions table for simulated checkout flow
  db.run(`
    CREATE TABLE IF NOT EXISTS checkout_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT UNIQUE,
      cart_json TEXT,
      total REAL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      paid_at TEXT
    );
  `);
});

// --- GET /api/items --- //
app.get('/api/items', (req, res) => {
  db.all(
    `SELECT id, name, category, price, image_url FROM products;`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// --- GET /api/categories --- //
app.get('/api/categories', (req, res) => {
  db.all('SELECT DISTINCT category FROM products;', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const formatted = rows.map((r, i) => ({ id: i + 1, name: r.category }));
    res.json(formatted);
  });
});

// --- GET /api/recommendations/top --- //
app.get('/api/recommendations/top', (req, res) => {
  const category = req.query.category || '';
  const limit = parseInt(req.query.n) || 5;

  db.all(
    `SELECT id, name, category, price, image_url FROM products WHERE category = ? LIMIT ?;`,
    [category, limit],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// --- Improved POST /api/recommendations/cart --- //
app.post('/api/recommendations/cart', (req, res) => {
  // cart: array of product IDs
  const cart = Array.isArray(req.body.cart) ? req.body.cart.map(Number) : [];
  if (!cart.length) return res.json([]);

  // Options (from body or query)
  const n = parseInt(req.body.n || req.query.n || 5);            // top-N
  const days = parseInt(req.body.days || req.query.days || 0);  // timeframe (0 = all)
  const min_cooccurrence = parseInt(req.body.min_co || 1);     // min co-occurrence count
  const use_recency = !!(req.body.use_recency || req.query.use_recency); // boolean

  // Build placeholders for cart ids
  const placeholders = cart.map(() => '?').join(',');

  // Recency decay lambda (half-life ~7 days). Adjust if needed.
  const lambda = Math.log(2) / 7.0;

  // Compose SQL (uses CTEs). Note: cart placeholders appear 3 times in parameters.
  const sql = `
    WITH
    candidate_orders AS (
      SELECT DISTINCT oi.order_id
      FROM order_items oi
      WHERE oi.product_id IN (${placeholders})
    ),

    order_weights AS (
      SELECT co.order_id,
        ${use_recency ? `o.created_at, exp(-${lambda} * (julianday('now') - julianday(o.created_at))) AS weight` : `1.0 AS weight`}
      FROM candidate_orders co
      LEFT JOIN orders o ON o.id = co.order_id
    ),

    cooccurs AS (
      SELECT oi.product_id AS id,
             SUM(ow.weight) AS co_weight,
             COUNT(DISTINCT oi.order_id) AS co_count
      FROM order_items oi
      JOIN order_weights ow ON ow.order_id = oi.order_id
      WHERE oi.product_id NOT IN (${placeholders})
      GROUP BY oi.product_id
    ),

    item_support AS (
      SELECT oi.product_id AS id,
             COUNT(DISTINCT oi.order_id) AS orders_with_item
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      ${days > 0 ? `WHERE julianday(o.created_at) >= julianday('now', '-${days} days')` : ''}
      GROUP BY oi.product_id
    ),

    total_candidate_orders AS (
      SELECT COUNT(DISTINCT order_id) AS cnt
      FROM order_items
      WHERE product_id IN (${placeholders})
    ),

    total_orders AS (
      SELECT COUNT(DISTINCT order_id) AS cnt
      FROM order_items
      ${days > 0 ? `WHERE order_id IN (SELECT id FROM orders WHERE julianday(created_at) >= julianday('now', '-${days} days'))` : ''}
    )

    SELECT
      p.id,
      p.name,
      p.category,
      p.price,
      p.image_url,
      co.co_count,
      co.co_weight,
      IFNULL(s.orders_with_item, 0) AS orders_with_item,
      tc.cnt AS candidate_orders_count,
      totn.cnt AS total_orders_count,
      ROUND(CAST(co.co_count AS FLOAT) / NULLIF(tc.cnt,0), 4) AS confidence,
      ROUND(CAST(co.co_count AS FLOAT) / NULLIF(s.orders_with_item,1), 4) AS support,
      ROUND( (CAST(co.co_count AS FLOAT) / NULLIF(tc.cnt,0)) / (CAST(s.orders_with_item AS FLOAT) / NULLIF(totn.cnt,1)), 4) AS lift
    FROM cooccurs co
    JOIN products p ON p.id = co.id
    LEFT JOIN item_support s ON s.id = co.id
    CROSS JOIN total_candidate_orders tc
    CROSS JOIN total_orders totn
    WHERE co.co_count >= ?
    ORDER BY co.co_count DESC, lift DESC
    LIMIT ?
  `;

  // Params: cart placeholders used 3 times, then min_cooccurrence, then n
  const params = [...cart, ...cart, ...cart, min_cooccurrence, n];

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Rec query error:', err);
      return res.status(500).json({ error: err.message });
    }

    // Enrich rows with a combined score = confidence * lift (fallback lift->1)
    const enriched = rows.map(r => {
      const co_count = Number(r.co_count || 0);
      const confidence = Number(r.confidence || 0);
      const lift = Number(r.lift || 0) || 1;
      const score = confidence * lift;
      return {
        id: r.id,
        name: r.name,
        category: r.category,
        price: r.price,
        image_url: r.image_url,
        co_count,
        confidence: Number(confidence.toFixed(4)),
        lift: Number((Number(r.lift) || 0).toFixed(4)),
        score: Number(score.toFixed(6))
      };
    }).sort((a, b) => b.score - a.score);

    res.json(enriched.slice(0, n));
  });
});


// ---------------- Simulated Checkout (QR) ---------------- //

// POST /api/checkout -> create checkout session and return qrDataUrl + checkoutUrl
app.post('/api/checkout', (req, res) => {
  try {
    const cart = Array.isArray(req.body.cart) ? req.body.cart.map(Number) : [];
    if (!cart.length) return res.status(400).json({ error: 'Cart empty' });

    // Get product prices for the given ids (server-side total)
    const placeholders = cart.map(() => '?').join(',');
    db.all(`SELECT id, price FROM products WHERE id IN (${placeholders})`, cart, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      const priceMap = Object.fromEntries(rows.map(r => [r.id, Number(r.price) || 0]));
      let total = 0;
      cart.forEach(id => { total += (priceMap[id] || 0); });

      const session_id = uuidv4();
      const cart_json = JSON.stringify(cart);

      db.run(
        `INSERT INTO checkout_sessions (session_id, cart_json, total, status) VALUES (?, ?, ?, ?)`,
        [session_id, cart_json, total, 'pending'],
        function(insertErr) {
          if (insertErr) return res.status(500).json({ error: insertErr.message });

          const checkoutUrl = `${req.protocol}://${req.get('host')}/checkout/${session_id}`;
          QRCode.toDataURL(checkoutUrl, { errorCorrectionLevel: 'H' }, (qrErr, dataUrl) => {
            if (qrErr) return res.status(500).json({ error: qrErr.message });
            res.json({ session_id, checkoutUrl, qrDataUrl: dataUrl, total });
          });
        }
      );
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /checkout/:session_id -> simple checkout page where the customer can press Pay
app.get('/checkout/:session_id', (req, res) => {
  const sessionId = req.params.session_id;
  db.get(`SELECT * FROM checkout_sessions WHERE session_id = ?`, [sessionId], (err, row) => {
    if (err) return res.status(500).send('Server error');
    if (!row) return res.status(404).send('Session not found');

    const cart = JSON.parse(row.cart_json || '[]');
    if (!cart.length) {
      return res.send(`<p>Cart empty</p>`);
    }

    const placeholders = cart.map(() => '?').join(',');
    db.all(`SELECT id, name, price FROM products WHERE id IN (${placeholders})`, cart, (pErr, products) => {
      if (pErr) return res.status(500).send('Server error');

      let itemsHtml = products.map(p => `<li>${p.name} — ₱${Number(p.price).toFixed(2)}</li>`).join('');
      const html = `
        <!doctype html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width,initial-scale=1" />
            <title>Checkout</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 1rem; color:#111; }
              button { padding: 10px 14px; background: #2563eb; color: #fff; border: none; border-radius: 8px; cursor: pointer; }
              .meta { color:#666; font-size:0.95rem; margin-top:0.8rem; }
            </style>
          </head>
          <body>
            <h2>Checkout</h2>
            <ul>${itemsHtml}</ul>
            <p><strong>Total: ₱${Number(row.total).toFixed(2)}</strong></p>
            <form method="POST" action="/checkout/${sessionId}/pay">
              <button type="submit">Pay (simulate)</button>
            </form>
            <p class="meta">This is a demo payment page — no real money is processed.</p>
          </body>
        </html>
      `;
      res.send(html);
    });
  });
});

// POST /checkout/:session_id/pay -> mark paid and create real order + order_items (demo)
app.post('/checkout/:session_id/pay', (req, res) => {
  const sessionId = req.params.session_id;
  db.get(`SELECT * FROM checkout_sessions WHERE session_id = ?`, [sessionId], (err, row) => {
    if (err) return res.status(500).send('Server error');
    if (!row) return res.status(404).send('Session not found');
    if (row.status === 'paid') return res.send('<p>Already paid. Thank you!</p>');

    const cart = JSON.parse(row.cart_json || '[]');

    // Create a new order (inserts into orders — assumes orders table exists)
    db.run(`INSERT INTO orders (created_at) VALUES (datetime('now'))`, function(orderErr) {
      if (orderErr) {
        console.error('Order creation error:', orderErr);
        return res.status(500).send('Server error');
      }
      const orderId = this.lastID;

      // Insert order_items
      const stmt = db.prepare(`INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)`);
      cart.forEach(pid => stmt.run(orderId, pid, 1));
      stmt.finalize((finErr) => {
        if (finErr) console.error('order_items finalize error:', finErr);

        const now = new Date().toISOString();
        db.run(`UPDATE checkout_sessions SET status = ?, paid_at = ? WHERE session_id = ?`, ['paid', now, sessionId], (uErr) => {
          if (uErr) console.error('checkout_sessions update error:', uErr);
          res.send(`<p>Payment successful! Order ${orderId} created. Thank you.</p>`);
        });
      });
    });
  });
});

// Serve static frontend
app.use(express.static(path.join(__dirname, '../frontend')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
