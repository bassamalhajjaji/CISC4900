import * as svc from "../services/customers.service.js";

export async function getCustomers(_req, res) {
  const rows = await svc.list();
  res.json(rows);
}
export async function postCustomer(req, res) {
  try {
    const id = await svc.create(req.body);
    res.status(201).json(id);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}