import { pool } from "../db/pool.js";

export async function list() {
  const [rows] = await pool.query("SELECT * FROM suppliers ORDER BY supplier_id DESC LIMIT 500");
  return rows;
}
export async function create(body) {
  const [r] = await pool.query(
    "INSERT INTO suppliers(name,email,phone,address) VALUES (?,?,?,?)",
    [body.name, body.email || null, body.phone || null, body.address || null]
  );
  return { supplier_id: r.insertId };
}