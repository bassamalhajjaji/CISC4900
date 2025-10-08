import { pool } from "../db/pool.js";
import { validateQuery } from "../utils/validate.js";
import { analyticsDailySchema } from "../utils/schemas.js";

export async function getLowStock(_req, res) {
  const [rows] = await pool.query("SELECT * FROM v_low_stock ORDER BY qty_on_hand ASC, name ASC");
  res.json(rows);
}

export const validateDaily = validateQuery(analyticsDailySchema);

export async function getDailySales(req, res) {
  const days = req.query.days;
  const [rows] = await pool.query(
    `SELECT DATE(created_at) as day, COUNT(*) as orders, SUM(total) as revenue
     FROM orders
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY DATE(created_at)
     ORDER BY day ASC`, [days]
  );
  res.json(rows);
}