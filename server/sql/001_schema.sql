CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  role ENUM('ADMIN','CASHIER','MANAGER') NOT NULL DEFAULT 'CASHIER',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS suppliers (
  supplier_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(120),
  phone VARCHAR(40),
  address VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS products (
  product_id INT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(60) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  category_id INT NOT NULL,
  supplier_id INT,
  unit_price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2) NOT NULL,
  reorder_level INT DEFAULT 10,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_prod_cat FOREIGN KEY (category_id) REFERENCES categories(category_id),
  CONSTRAINT fk_prod_sup FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
);

CREATE TABLE IF NOT EXISTS stock_levels (
  product_id INT PRIMARY KEY,
  qty_on_hand INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_stock_prod FOREIGN KEY (product_id) REFERENCES products(product_id)
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  movement_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  delta_qty INT NOT NULL,
  reason ENUM('PURCHASE','SALE','RETURN_IN','RETURN_OUT','ADJUSTMENT') NOT NULL,
  ref_type ENUM('ORDER','PO','ADJUSTMENT') NOT NULL,
  ref_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_inv_prod FOREIGN KEY (product_id) REFERENCES products(product_id)
);

CREATE TABLE IF NOT EXISTS customers (
  customer_id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(120) UNIQUE,
  phone VARCHAR(40),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  order_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT,
  user_id INT NOT NULL,
  status ENUM('PENDING','PAID','CANCELLED','REFUNDED') DEFAULT 'PAID',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_cust FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  CONSTRAINT fk_order_user FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS order_items (
  order_item_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT NOT NULL,
  product_id INT NOT NULL,
  qty INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_item_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
  CONSTRAINT fk_item_product FOREIGN KEY (product_id) REFERENCES products(product_id)
);

CREATE TABLE IF NOT EXISTS payments (
  payment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT NOT NULL,
  method ENUM('CASH','CARD','OTHER') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pay_order FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

CREATE OR REPLACE VIEW v_low_stock AS
SELECT p.product_id, p.sku, p.name, s.qty_on_hand, p.reorder_level
FROM products p
JOIN stock_levels s ON s.product_id = p.product_id
WHERE s.qty_on_hand <= p.reorder_level;

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_stock_levels_qty ON stock_levels(qty_on_hand);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_prod ON order_items(product_id);