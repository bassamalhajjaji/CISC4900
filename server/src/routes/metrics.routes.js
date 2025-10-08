import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getLowStock, getDailySales, validateDaily } from "../controllers/metrics.controller.js";

const r = Router();
r.get("/low-stock", requireAuth, getLowStock);
r.get("/sales/daily", requireAuth, validateDaily, getDailySales);
export default r;