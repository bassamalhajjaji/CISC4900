import * as svc from "../services/products.service.js";

export async function getProducts(req, res) {
  try {
    const rows = await svc.list({ search: req.query.search });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
export async function postProduct(req, res) {
  try {
    const id = await svc.create(req.body);
    res.status(201).json(id);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}