import { pool } from "../db/pool.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function login(email, password) {
  const [rows] = await pool.query("SELECT * FROM users WHERE email=?", [email]);
  const user = rows[0];
  if (!user) throw new Error("Invalid credentials");
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new Error("Invalid credentials");
  const token = jwt.sign(
    { user_id: user.user_id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || "2d" }
  );
  return { token, user: { user_id: user.user_id, full_name: user.full_name, role: user.role, email: user.email } };
}