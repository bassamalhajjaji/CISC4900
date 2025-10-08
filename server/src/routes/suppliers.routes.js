import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody } from "../utils/validate.js";
import { supplierCreateSchema } from "../utils/schemas.js";
import { getSuppliers, postSupplier } from "../controllers/suppliers.controller.js";

const r = Router();
r.get("/", requireAuth, getSuppliers);
r.post("/", requireAuth, requireRole("ADMIN","MANAGER"), validateBody(supplierCreateSchema), postSupplier);
export default r;