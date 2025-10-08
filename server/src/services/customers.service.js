import { pool } from "../db/pool.js";

export async function list() {
  const [rows] = await pool.query("SELECT * FROM customers ORDER BY created_at DESC LIMIT 500");
  return rows;
}

export async function create(body) {
  const [r] = await pool.query(
    "INSERT INTO customers(full_name,email,phone) VALUES (?,?,?)",
    [body.full_name, body.email || null, body.phone || null]
  );
  return { customer_id: r.insertId };
}