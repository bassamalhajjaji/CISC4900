import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody } from "../utils/validate.js";
import { customerCreateSchema } from "../utils/schemas.js";
import { getCustomers, postCustomer } from "../controllers/customers.controller.js";

const r = Router();
r.get("/", requireAuth, getCustomers);
r.post("/", requireAuth, requireRole("ADMIN","MANAGER"), validateBody(customerCreateSchema), postCustomer);
export default r;