import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { postOrder, getOrder, validateCreate } from "../controllers/orders.controller.js";

const r = Router();
r.post("/", requireAuth, requireRole("ADMIN","MANAGER","CASHIER"), validateCreate, postOrder);
r.get("/:id", requireAuth, getOrder);
export default r;