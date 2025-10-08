import * as svc from "../services/inventory.service.js";

export async function postAdjust(req, res) {
  try {
    const result = await svc.adjust(req.body);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}