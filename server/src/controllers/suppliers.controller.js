import * as svc from "../services/suppliers.service.js";

export async function getSuppliers(_req, res) {
  const rows = await svc.list();
  res.json(rows);
}
export async function postSupplier(req, res) {
  try {
    const id = await svc.create(req.body);
    res.status(201).json(id);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}