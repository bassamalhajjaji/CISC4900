import { pool } from "../db/pool.js";

export async function list({ search }) {
  if (search) {
    const like = `%${search}%`;
    const [rows] = await pool.query(
      `SELECT p.*, s.qty_on_hand
       FROM products p
       JOIN stock_levels s ON s.product_id = p.product_id
       WHERE p.name LIKE ? OR p.sku LIKE ?
       ORDER BY p.name LIMIT 200`, [like, like]
    );
    return rows;
  }
  const [rows] = await pool.query(
    `SELECT p.*, s.qty_on_hand
     FROM products p
     JOIN stock_levels s ON s.product_id = p.product_id
     ORDER BY p.name LIMIT 200`
  );
  return rows;
}

export async function create(body) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      `INSERT INTO products (sku,name,category_id,supplier_id,unit_price,cost_price,reorder_level,is_active)
       VALUES (?,?,?,?,?,?,?,1)`,
      [body.sku, body.name, body.category_id, body.supplier_id || null,
       body.unit_price, body.cost_price, body.reorder_level || 10]
    );
    await conn.query("INSERT INTO stock_levels (product_id, qty_on_hand) VALUES (?, ?)",
      [r.insertId, body.qty_on_hand ?? 0]);
    await conn.commit();
    return { product_id: r.insertId };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}