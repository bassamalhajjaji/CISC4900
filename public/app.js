let state = {
  products: [],
  sales: []
};

let currentUser = null;
let cart = [];

//  Helpers 

function formatCurrency(n) {
  return "$" + n.toFixed(2);
}

function isToday(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    credentials: "same-origin",
    ...options
  });

  if (res.status === 401) {
    // Not authorized show login
    showLogin();
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Request failed");
  }
  if (res.status === 204) return null;
  return res.json();
}

//  Auth UI 

const loginScreen = document.getElementById("login-screen");
const appRoot = document.getElementById("app-root");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const userInfo = document.getElementById("user-info");
const btnLogout = document.getElementById("btn-logout");

function showLogin() {
  appRoot.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  loginError.textContent = "";
}

function showApp() {
  loginScreen.classList.add("hidden");
  appRoot.classList.remove("hidden");
}

async function checkAuth() {
  try {
    const me = await apiFetch("/api/auth/me", { method: "GET" });
    currentUser = me;
    userInfo.textContent = `Signed in as ${me.username}`;
    showApp();
    await loadData();
  } catch {
    showLogin();
  }
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value.trim();

  try {
    const me = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });
    currentUser = me;
    userInfo.textContent = `Signed in as ${me.username}`;
    showApp();
    await loadData();
  } catch (err) {
    loginError.textContent = "Invalid username or password.";
    console.error(err);
  }
});

btnLogout.addEventListener("click", async () => {
  try {
    await apiFetch("/api/auth/logout", { method: "POST" });
  } catch (err) {
    console.error(err);
  } finally {
    currentUser = null;
    state = { products: [], sales: [] };
    cart = [];
    showLogin();
  }
});

// Navigation 

const screens = document.querySelectorAll("main section");
const navButtons = document.querySelectorAll(".nav-btn[data-screen]");

function showScreen(id) {
  screens.forEach((s) => {
    s.id === "screen-" + id
      ? s.classList.remove("hidden")
      : s.classList.add("hidden");
  });
  navButtons.forEach((btn) => {
    btn.dataset.screen === id
      ? btn.classList.add("active")
      : btn.classList.remove("active");
  });
}

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => showScreen(btn.dataset.screen));
});

//  Data loading 

async function loadData() {
  const [products, sales] = await Promise.all([
    apiFetch("/api/products", { method: "GET" }),
    apiFetch("/api/sales", { method: "GET" })
  ]);
  state.products = products;
  state.sales = sales;
  refreshUI();
}

function refreshUI() {
  refreshDashboard();
  renderProductsTable();
  renderPosProductsTable();
  renderCart();
  renderSalesTable();
}

//  Dashboard 

function refreshDashboard() {
  const totalProducts = state.products.length;
  const stockOnHand = state.products.reduce(
    (sum, p) => sum + (p.stock || 0),
    0
  );
  const todayRevenue = state.sales
    .filter((s) => isToday(s.date))
    .reduce((sum, s) => sum + s.total, 0);

  document.getElementById("stat-total-products").textContent = totalProducts;
  document.getElementById("stat-stock-on-hand").textContent = stockOnHand;
  document.getElementById("stat-today-revenue").textContent =
    formatCurrency(todayRevenue);

  const today = new Date();
  document.getElementById("stat-today-date").textContent =
    "Today · " +
    today.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });

  // Low stock
  const lowStockItems = state.products.filter(
    (p) => p.stock <= p.min_stock
  );
  document.getElementById("badge-low-stock").textContent =
    lowStockItems.length + " item" + (lowStockItems.length !== 1 ? "s" : "");

  const lowStockTable = document.getElementById("table-low-stock");
  lowStockTable.innerHTML = "";
  if (lowStockItems.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.className = "text-muted";
    cell.textContent = "No low stock products. You're fully stocked 🚀";
    row.appendChild(cell);
    lowStockTable.appendChild(row);
  } else {
    lowStockItems.forEach((p) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${p.name}</td>
        <td>${p.sku}</td>
        <td><span class="pill pill-low">${p.stock}</span></td>
      `;
      lowStockTable.appendChild(row);
    });
  }

  // Recent sales (last 5)
  const recent = [...state.sales]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);
  const recentTable = document.getElementById("table-recent-sales");
  recentTable.innerHTML = "";
  if (recent.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.className = "text-muted";
    cell.textContent = "No sales recorded yet.";
    row.appendChild(cell);
    recentTable.appendChild(row);
  } else {
    recent.forEach((s) => {
      const row = document.createElement("tr");
      const date = new Date(s.date);
      row.innerHTML = `
        <td>${date.toLocaleString()}</td>
        <td class="text-right">${s.units_count}</td>
        <td class="text-right">${formatCurrency(s.total)}</td>
      `;
      recentTable.appendChild(row);
    });
  }
}

//  Inventory 

const productForm = document.getElementById("form-product");
const productIdInput = document.getElementById("product-id");
const nameInput = document.getElementById("product-name");
const skuInput = document.getElementById("product-sku");
const categoryInput = document.getElementById("product-category");
const priceInput = document.getElementById("product-price");
const stockInput = document.getElementById("product-stock");
const minStockInput = document.getElementById("product-min-stock");
const inventorySearchInput = document.getElementById("inventory-search");

function clearProductForm() {
  productIdInput.value = "";
  nameInput.value = "";
  skuInput.value = "";
  categoryInput.value = "";
  priceInput.value = "";
  stockInput.value = "";
  minStockInput.value = 5;
}

function renderProductsTable() {
  const tbody = document.getElementById("table-products");
  const query = inventorySearchInput.value.toLowerCase().trim();
  tbody.innerHTML = "";

  let products = state.products;
  if (query) {
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query)
    );
  }

  if (products.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.className = "text-muted";
    cell.textContent = "No products found. Add one above.";
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  products.forEach((p) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${p.name}</td>
      <td>${p.sku}</td>
      <td>${p.category || "-"}</td>
      <td class="text-right">${formatCurrency(p.price)}</td>
      <td class="text-right">
        <span class="pill ${p.stock <= p.min_stock ? "pill-low" : ""}">
          ${p.stock}
        </span>
      </td>
      <td class="text-right">
        <button class="btn btn-outline btn-sm" data-action="edit" data-id="${p.id}">Edit</button>
        <button class="btn btn-danger btn-sm" data-action="delete" data-id="${p.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

productForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = productIdInput.value;
  const data = {
    name: nameInput.value.trim(),
    sku: skuInput.value.trim(),
    category: categoryInput.value.trim(),
    price: parseFloat(priceInput.value),
    stock: parseInt(stockInput.value, 10),
    minStock: parseInt(minStockInput.value || "0", 10)
  };

  try {
    if (id) {
      // update
      const products = await apiFetch(`/api/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      });
      state.products = products;
    } else {
      // create
      const products = await apiFetch("/api/products", {
        method: "POST",
        body: JSON.stringify(data)
      });
      state.products = products;
    }
    clearProductForm();
    refreshUI();
  } catch (err) {
    console.error(err);
    alert("Error saving product.");
  }
});

document.getElementById("btn-clear-form").addEventListener("click", () => {
  clearProductForm();
});

document
  .getElementById("table-products")
  .addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    const product = state.products.find((p) => p.id == id);
    if (!product) return;

    if (action === "edit") {
      productIdInput.value = product.id;
      nameInput.value = product.name;
      skuInput.value = product.sku;
      categoryInput.value = product.category;
      priceInput.value = product.price;
      stockInput.value = product.stock;
      minStockInput.value = product.min_stock;
      showScreen("inventory");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (action === "delete") {
      if (confirm(`Delete product "${product.name}"?`)) {
        try {
          const products = await apiFetch(`/api/products/${id}`, {
            method: "DELETE"
          });
          state.products = products;
          refreshUI();
        } catch (err) {
          console.error(err);
          alert("Error deleting product.");
        }
      }
    }
  });

inventorySearchInput.addEventListener("input", renderProductsTable);

document
  .getElementById("btn-reset-sample-data")
  .addEventListener("click", async () => {
    if (
      !confirm(
        "Replace existing data with sample products and clear all sales?"
      )
    )
      return;
    try {
      const products = await apiFetch("/api/products/reset-sample", {
        method: "POST"
      });
      state.products = products;
      state.sales = [];
      refreshUI();
    } catch (err) {
      console.error(err);
      alert("Error resetting sample data.");
    }
  });

//  POS / Cart 

const posSearchInput = document.getElementById("pos-search");
const posQuantityInput = document.getElementById("pos-quantity");

function renderPosProductsTable() {
  const tbody = document.getElementById("table-pos-products");
  const query = posSearchInput.value.toLowerCase().trim();
  tbody.innerHTML = "";

  let products = state.products;
  if (query) {
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query)
    );
  }

  if (products.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "text-muted";
    cell.textContent = "No matching products. Try another search.";
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  products.forEach((p) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${p.name}</td>
      <td>${p.sku}</td>
      <td class="text-right">${formatCurrency(p.price)}</td>
      <td class="text-right">${p.stock}</td>
      <td class="text-right">
        <button class="btn btn-primary btn-sm" data-id="${p.id}">
          Add
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

document
  .getElementById("table-pos-products")
  .addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const id = parseInt(btn.dataset.id, 10);
    const product = state.products.find((p) => p.id === id);
    if (!product) return;

    const qty = parseInt(posQuantityInput.value, 10) || 1;
    if (qty <= 0) return;
    if (qty > product.stock) {
      alert("Not enough stock for this product.");
      return;
    }

    const existing = cart.find((item) => item.productId === id);
    if (existing) {
      if (existing.quantity + qty > product.stock) {
        alert("Not enough stock for this product.");
        return;
      }
      existing.quantity += qty;
    } else {
      cart.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: qty
      });
    }
    renderCart();
  });

function renderCart() {
  const container = document.getElementById("cart-items");
  container.innerHTML = "";

  if (cart.length === 0) {
    const div = document.createElement("div");
    div.className = "cart-empty";
    div.textContent = "Cart is empty. Add products from the left panel.";
    container.appendChild(div);
  } else {
    cart.forEach((item, index) => {
      const div = document.createElement("div");
      div.className = "cart-item";
      div.innerHTML = `
        <div>
          <div style="font-size:0.9rem;">${item.name}</div>
          <div class="text-muted" style="font-size:0.75rem;">
            ${formatCurrency(item.price)} × 
            <input type="number" min="1" value="${item.quantity}" 
                   data-index="${index}" class="cart-qty-input" 
                   style="width:55px; border-radius:999px; border:1px solid #e5e7eb; padding:0 0.25rem; margin-left:0.15rem;" />
          </div>
        </div>
        <div class="flex">
          <div style="font-weight:600; font-size:0.9rem;">
            ${formatCurrency(item.price * item.quantity)}
          </div>
          <button class="btn btn-danger btn-sm" data-remove="${index}">×</button>
        </div>
      `;
      container.appendChild(div);
    });
  }

  const itemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  document.getElementById("cart-items-count").textContent = itemsCount;
  document.getElementById("cart-subtotal").textContent =
    formatCurrency(subtotal);
  document.getElementById("cart-tax").textContent = formatCurrency(tax);
  document.getElementById("cart-total").textContent = formatCurrency(total);
}

document
  .getElementById("cart-items")
  .addEventListener("input", (e) => {
    if (!e.target.classList.contains("cart-qty-input")) return;
    const index = parseInt(e.target.dataset.index, 10);
    let qty = parseInt(e.target.value, 10) || 1;
    if (qty <= 0) qty = 1;

    const item = cart[index];
    const product = state.products.find((p) => p.id === item.productId);
    if (!product) return;

    if (qty > product.stock) {
      alert("Not enough stock for this product.");
      e.target.value = item.quantity;
      return;
    }
    item.quantity = qty;
    renderCart();
  });

document
  .getElementById("cart-items")
  .addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const index = btn.dataset.remove;
    if (index !== undefined) {
      cart.splice(parseInt(index, 10), 1);
      renderCart();
    }
  });

document.getElementById("btn-clear-cart").addEventListener("click", () => {
  cart = [];
  renderCart();
});

document.getElementById("btn-complete-sale").addEventListener("click", async () => {
  const posMessage = document.getElementById("pos-message");
  posMessage.textContent = "";
  if (cart.length === 0) {
    posMessage.textContent = "Cart is empty. Add items before completing the sale.";
    return;
  }

  try {
    const payload = {
      items: cart.map((i) => ({
        productId: i.productId,
        quantity: i.quantity
      }))
    };
    const { sale, products } = await apiFetch("/api/sales", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    state.products = products;
    state.sales.unshift(sale);
    cart = [];
    refreshUI();
    posMessage.textContent = "Sale completed successfully!";
    setTimeout(() => (posMessage.textContent = ""), 3000);
  } catch (err) {
    console.error(err);
    alert("Error completing sale: " + err.message);
  }
});

posSearchInput.addEventListener("input", renderPosProductsTable);

//  Sales history 

const salesFilter = document.getElementById("sales-filter");

function renderSalesTable() {
  const tbody = document.getElementById("table-sales");
  tbody.innerHTML = "";

  let filtered = [...state.sales];
  const filter = salesFilter.value;
  const now = new Date();

  if (filter === "today") {
    filtered = filtered.filter((s) => isToday(s.date));
  } else if (filter === "7" || filter === "30") {
    const days = parseInt(filter, 10);
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    filtered = filtered.filter((s) => new Date(s.date) >= cutoff);
  }

  if (filtered.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.className = "text-muted";
    cell.textContent = "No sales for the selected period.";
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  filtered.forEach((s) => {
    const row = document.createElement("tr");
    const date = new Date(s.date);
    row.innerHTML = `
      <td>${date.toLocaleString()}</td>
      <td class="text-right">${s.units_count}</td>
      <td class="text-right">${formatCurrency(s.total)}</td>
    `;
    tbody.appendChild(row);
  });
}

salesFilter.addEventListener("change", renderSalesTable);

// Export sales JSON (from state, which came from DB)
document
  .getElementById("btn-export-sales-json")
  .addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state.sales, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "retailflow_sales_export.json";
    a.click();
    URL.revokeObjectURL(url);
  });

//  Settings: backup & clear data 

document.getElementById("btn-backup-data").addEventListener("click", async () => {
  try {
    const backup = await apiFetch("/api/backup", { method: "GET" });
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "retailflow_backup.json";
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert("Error creating backup.");
  }
});

document.getElementById("btn-clear-data").addEventListener("click", async () => {
  if (!confirm("Clear all products and sales from the database?")) return;
  try {
    await apiFetch("/api/clear", { method: "POST" });
    await loadData();
  } catch (err) {
    console.error(err);
    alert("Error clearing data.");
  }
});

//  Initialize 

window.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  showScreen("dashboard");
});