const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

//  Database setup 

const DB_FILE = path.join(__dirname, "retailflow.db");
const db = new sqlite3.Database(DB_FILE);

// Helper: Promisified DB functions
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, function (err, row) {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, function (err, rows) {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function initDb() {
  // Create tables
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      category TEXT,
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      min_stock INTEGER NOT NULL DEFAULT 0
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      subtotal REAL NOT NULL,
      tax REAL NOT NULL,
      total REAL NOT NULL,
      user_id INTEGER,
      items_count INTEGER NOT NULL,
      units_count INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      FOREIGN KEY(sale_id) REFERENCES sales(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `);

  // Seed admin user if none exists
  const userCountRow = await dbGet(`SELECT COUNT(*) AS count FROM users`);
  if (userCountRow.count === 0) {
    const hash = bcrypt.hashSync("admin123", 10);
    await dbRun(
      `INSERT INTO users (username, password_hash) VALUES (?, ?)`,
      ["admin", hash]
    );
    console.log("Seeded default admin user: username=admin, password=admin123");
  }

  // Seed sample products if none exists
  const productCountRow = await dbGet(`SELECT COUNT(*) AS count FROM products`);
  if (productCountRow.count === 0) {
    console.log("Seeding sample products...");
    const sampleProducts = [
      {
        name: "Classic T-Shirt",
        sku: "TS-001",
        category: "Apparel",
        price: 19.99,
        stock: 35,
        min_stock: 5
      },
      {
        name: "Slim Fit Jeans",
        sku: "JN-002",
        category: "Apparel",
        price: 49.99,
        stock: 18,
        min_stock: 5
      },
      {
        name: "Running Sneakers",
        sku: "SN-003",
        category: "Footwear",
        price: 79.99,
        stock: 8,
        min_stock: 4
      },
      {
        name: "Baseball Cap",
        sku: "CP-004",
        category: "Accessories",
        price: 14.99,
        stock: 3,
        min_stock: 5
      }
    ];

    for (const p of sampleProducts) {
      await dbRun(
        `INSERT INTO products (name, sku, category, price, stock, min_stock)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [p.name, p.sku, p.category, p.price, p.stock, p.min_stock]
      );
    }
  }
}

//  Middleware 

app.use(express.json());

app.use(
  session({
    secret: "retailflow_secret_for_demo",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 2 // 2 hours
    }
  })
);

app.use(express.static(path.join(__dirname, "public")));

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

//  Auth Routes 

// Get current user
app.get("/api/auth/me", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not logged in" });
  }
  res.json({ id: req.session.userId, username: req.session.username });
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: "Missing credentials" });

    const user = await dbGet(`SELECT * FROM users WHERE username = ?`, [
      username
    ]);
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const ok = bcrypt.compareSync(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({ id: user.id, username: user.username });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Logout
app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logged out" });
  });
});

//  Product Routes 

// Get all products
app.get("/api/products", requireAuth, async (req, res) => {
  try {
    const products = await dbAll(`SELECT * FROM products ORDER BY name ASC`);
    res.json(products);
  } catch (err) {
    console.error("Get products error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Create product
app.post("/api/products", requireAuth, async (req, res) => {
  try {
    const { name, sku, category, price, stock, minStock } = req.body;
    if (!name || !sku || price == null || stock == null) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    await dbRun(
      `INSERT INTO products (name, sku, category, price, stock, min_stock)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, sku, category || "", price, stock, minStock || 0]
    );

    const products = await dbAll(`SELECT * FROM products ORDER BY name ASC`);
    res.status(201).json(products);
  } catch (err) {
    console.error("Create product error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update product
app.put("/api/products/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const { name, sku, category, price, stock, minStock } = req.body;
    if (!name || !sku || price == null || stock == null) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    await dbRun(
      `UPDATE products
       SET name = ?, sku = ?, category = ?, price = ?, stock = ?, min_stock = ?
       WHERE id = ?`,
      [name, sku, category || "", price, stock, minStock || 0, id]
    );

    const products = await dbAll(`SELECT * FROM products ORDER BY name ASC`);
    res.json(products);
  } catch (err) {
    console.error("Update product error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete product
app.delete("/api/products/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    await dbRun(`DELETE FROM products WHERE id = ?`, [id]);
    const products = await dbAll(`SELECT * FROM products ORDER BY name ASC`);
    res.json(products);
  } catch (err) {
    console.error("Delete product error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Reset sample data (products only, clears sales)
app.post("/api/products/reset-sample", requireAuth, async (req, res) => {
  try {
    await dbRun(`DELETE FROM sale_items`);
    await dbRun(`DELETE FROM sales`);
    await dbRun(`DELETE FROM products`);

    const sampleProducts = [
      {
        name: "Classic T-Shirt",
        sku: "TS-001",
        category: "Apparel",
        price: 19.99,
        stock: 35,
        min_stock: 5
      },
      {
        name: "Slim Fit Jeans",
        sku: "JN-002",
        category: "Apparel",
        price: 49.99,
        stock: 18,
        min_stock: 5
      },
      {
        name: "Running Sneakers",
        sku: "SN-003",
        category: "Footwear",
        price: 79.99,
        stock: 8,
        min_stock: 4
      },
      {
        name: "Baseball Cap",
        sku: "CP-004",
        category: "Accessories",
        price: 14.99,
        stock: 3,
        min_stock: 5
      }
    ];

    for (const p of sampleProducts) {
      await dbRun(
        `INSERT INTO products (name, sku, category, price, stock, min_stock)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [p.name, p.sku, p.category, p.price, p.stock, p.min_stock]
      );
    }

    const products = await dbAll(`SELECT * FROM products ORDER BY name ASC`);
    res.json(products);
  } catch (err) {
    console.error("Reset sample data error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

//  Sales Routes 

// Get all sales
app.get("/api/sales", requireAuth, async (req, res) => {
  try {
    const sales = await dbAll(
      `SELECT * FROM sales ORDER BY datetime(date) DESC`
    );
    res.json(sales);
  } catch (err) {
    console.error("Get sales error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Create sale (cart checkout)
app.post("/api/sales", requireAuth, async (req, res) => {
  try {
    const { items } = req.body; // [{ productId, quantity }]
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Validate stock and gather product info
    let subtotal = 0;
    let unitsCount = 0;

    for (const item of items) {
      const { productId, quantity } = item;
      if (!productId || !quantity || quantity <= 0) {
        return res
          .status(400)
          .json({ message: "Invalid item in cart", item });
      }

      const product = await dbGet(
        `SELECT * FROM products WHERE id = ?`,
        [productId]
      );
      if (!product) {
        return res.status(400).json({ message: "Product not found", productId });
      }
      if (product.stock < quantity) {
        return res.status(400).json({
          message: `Not enough stock for product ${product.name}`
        });
      }

      subtotal += product.price * quantity;
      unitsCount += quantity;
    }

    const tax = subtotal * 0.08;
    const total = subtotal + tax;
    const itemsCount = items.length;
    const userId = req.session.userId || null;
    const now = new Date().toISOString();

    // Insert sale
    const saleResult = await dbRun(
      `INSERT INTO sales (date, subtotal, tax, total, user_id, items_count, units_count)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [now, subtotal, tax, total, userId, itemsCount, unitsCount]
    );
    const saleId = saleResult.lastID;

    // Insert sale items & update product stock
    for (const item of items) {
      const product = await dbGet(
        `SELECT * FROM products WHERE id = ?`,
        [item.productId]
      );

      await dbRun(
        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price)
         VALUES (?, ?, ?, ?)`,
        [saleId, item.productId, item.quantity, product.price]
      );

      await dbRun(
        `UPDATE products SET stock = stock - ? WHERE id = ?`,
        [item.quantity, item.productId]
      );
    }

    const sale = await dbGet(`SELECT * FROM sales WHERE id = ?`, [saleId]);
    const products = await dbAll(`SELECT * FROM products ORDER BY name ASC`);

    res.status(201).json({ sale, products });
  } catch (err) {
    console.error("Create sale error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

//  Backup & Clear Data 

// Backup all data
app.get("/api/backup", requireAuth, async (req, res) => {
  try {
    const products = await dbAll(`SELECT * FROM products`);
    const sales = await dbAll(`SELECT * FROM sales`);
    const saleItems = await dbAll(`SELECT * FROM sale_items`);

    res.json({ products, sales, saleItems });
  } catch (err) {
    console.error("Backup error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Clear all data (keep users)
app.post("/api/clear", requireAuth, async (req, res) => {
  try {
    await dbRun(`DELETE FROM sale_items`);
    await dbRun(`DELETE FROM sales`);
    await dbRun(`DELETE FROM products`);
    res.json({ message: "All product and sales data cleared." });
  } catch (err) {
    console.error("Clear data error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

//  Start server 

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`RetailFlow server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });