import { orderCreateSchema } from "../utils/schemas.js";
import { validateBody } from "../utils/validate.js";
import * as svc from "../services/orders.service.js";

export const validateCreate = validateBody(orderCreateSchema);

export async function postOrder(req, res) {
  try {
    const result = await svc.createOrder(req.body, req.user);
    res.status(201).json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

export async function getOrder(req, res) {
  const id = +req.params.id;
  const o = await svc.getOrder(id);
  if (!o) return res.status(404).json({ error: "Not found" });
  res.json(o);
}