import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody } from "../utils/validate.js";
import { inventoryAdjustSchema } from "../utils/schemas.js";
import { postAdjust } from "../controllers/inventory.controller.js";

const r = Router();
r.post("/adjust", requireAuth, requireRole("ADMIN","MANAGER"), validateBody(inventoryAdjustSchema), postAdjust);
export default r;