import { pool } from "../db/pool.js";

export async function adjust({ product_id, delta_qty, reason }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[prod]] = await conn.query("SELECT product_id FROM products WHERE product_id=?", [product_id]);
    if (!prod) throw new Error("Product not found");

    const [[stock]] = await conn.query("SELECT qty_on_hand FROM stock_levels WHERE product_id=?", [product_id]);
    if (!stock) {
      const start = Math.max(0, delta_qty);
      await conn.query("INSERT INTO stock_levels(product_id, qty_on_hand) VALUES(?,?)", [product_id, start]);
    } else {
      const newQty = stock.qty_on_hand + delta_qty;
      if (newQty < 0) throw new Error("Insufficient stock for adjustment");
      await conn.query("UPDATE stock_levels SET qty_on_hand=? WHERE product_id=?", [newQty, product_id]);
    }

    await conn.query(
      `INSERT INTO inventory_movements(product_id, delta_qty, reason, ref_type, ref_id)
       VALUES (?,?,?,'ADJUSTMENT',0)`,
      [product_id, delta_qty, reason]
    );

    await conn.commit();
    return { ok: true };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}