import { pool } from "../db/pool.js";

export async function createOrder({ customer_id, items, tax_rate, discount, payment }, user) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let subtotal = 0;
    for (const it of items) {
      const [[p]] = await conn.query(
        "SELECT product_id, unit_price FROM products WHERE product_id=?",
        [it.product_id]
      );
      if (!p) throw new Error(`Product ${it.product_id} not found`);

      const [[s]] = await conn.query("SELECT qty_on_hand FROM stock_levels WHERE product_id=?", [it.product_id]);
      const qty = s ? s.qty_on_hand : 0;
      if (qty < it.qty) throw new Error(`Insufficient stock for product ${it.product_id}`);

      subtotal += it.unit_price * it.qty;
    }

    const tax = +(subtotal * (tax_rate || 0)).toFixed(2);
    const totalBefore = subtotal + tax;
    const total = +(totalBefore - (discount || 0)).toFixed(2);

    const [orderRes] = await conn.query(
      "INSERT INTO orders(customer_id,user_id,status,subtotal,tax,discount,total) VALUES (?,?,?,?,?,?,?)",
      [customer_id || null, user.user_id, 'PAID', subtotal, tax, discount || 0, total]
    );
    const order_id = orderRes.insertId;

    for (const it of items) {
      const line = +(it.unit_price * it.qty).toFixed(2);
      await conn.query(
        "INSERT INTO order_items(order_id,product_id,qty,unit_price,line_total) VALUES (?,?,?,?,?)",
        [order_id, it.product_id, it.qty, it.unit_price, line]
      );

      const [[s]] = await conn.query("SELECT qty_on_hand FROM stock_levels WHERE product_id=?", [it.product_id]);
      const newQty = (s ? s.qty_on_hand : 0) - it.qty;
      if (newQty < 0) throw new Error(`Stock race condition for product ${it.product_id}`);
      await conn.query("UPDATE stock_levels SET qty_on_hand=? WHERE product_id=?", [newQty, it.product_id]);

      await conn.query(
        `INSERT INTO inventory_movements(product_id, delta_qty, reason, ref_type, ref_id)
         VALUES (?,?, 'SALE', 'ORDER', ?)`,
        [it.product_id, -it.qty, order_id]
      );
    }

    await conn.query(
      "INSERT INTO payments(order_id, method, amount) VALUES (?,?,?)",
      [order_id, payment.method, payment.amount]
    );

    await conn.commit();
    return { order_id, subtotal, tax, discount: discount || 0, total };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function getOrder(id) {
  const [[o]] = await pool.query("SELECT * FROM orders WHERE order_id=?", [id]);
  if (!o) return null;
  const [items] = await pool.query(
    `SELECT oi.*, p.sku, p.name FROM order_items oi
     JOIN products p ON p.product_id = oi.product_id
     WHERE oi.order_id=?`, [id]
  );
  const [pays] = await pool.query("SELECT * FROM payments WHERE order_id=?", [id]);
  return { ...o, items, payments: pays };
}