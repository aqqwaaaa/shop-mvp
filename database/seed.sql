-- Drop old tables (if they exist)
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS order_items;

-- Create Categories
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

-- Create Products
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  category_id INTEGER,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Create Orders
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create Order Items (many-to-many relationship)
CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER,
  product_id INTEGER,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Seed Categories
INSERT INTO categories (name) VALUES
('Sport Parts'),
('V-Twin Parts'),
('Dirt Parts');

-- Seed Products
INSERT INTO products (name, price, category_id) VALUES
('Brake Pads', 50.0, 1),
('Sport Helmet', 120.0, 1),
('Oil Filter', 25.0, 2),
('Engine Guard', 90.0, 2),
('Dirt Gloves', 35.0, 3),
('Mud Tires', 200.0, 3);

-- Seed Orders (simulate past purchases)
INSERT INTO orders DEFAULT VALUES;
INSERT INTO order_items (order_id, product_id) VALUES (1, 1), (1, 2);
INSERT INTO orders DEFAULT VALUES;
INSERT INTO order_items (order_id, product_id) VALUES (2, 2), (2, 3);
INSERT INTO orders DEFAULT VALUES;
INSERT INTO order_items (order_id, product_id) VALUES (3, 4), (3, 5);
