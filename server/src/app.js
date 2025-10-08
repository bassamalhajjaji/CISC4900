import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./db/pool.js";
import api from "./routes/index.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    res.json({ status: "ok", db: rows[0].ok === 1 });
  } catch {
    res.status(500).json({ status: "db_error" });
  }
});

app.use("/api", api);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API listening on :${port}`));