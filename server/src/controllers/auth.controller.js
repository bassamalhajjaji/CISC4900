import * as svc from "../services/auth.service.js";

export async function postLogin(req, res) {
  try {
    const { email, password } = req.body;
    const result = await svc.login(email, password);
    res.json(result);
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
}