import { Router } from "express";
import { getProducts, postProduct } from "../controllers/products.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody } from "../utils/validate.js";
import { productCreateSchema } from "../utils/schemas.js";

const r = Router();
r.get("/", requireAuth, getProducts);
r.post("/", requireAuth, requireRole("ADMIN","MANAGER"), validateBody(productCreateSchema), postProduct);
export default r;