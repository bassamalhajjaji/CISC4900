import { Router } from "express";
import authRoutes from "./auth.routes.js";
import productRoutes from "./products.routes.js";
import customerRoutes from "./customers.routes.js";
import supplierRoutes from "./suppliers.routes.js";
import inventoryRoutes from "./inventory.routes.js";
import orderRoutes from "./orders.routes.js";
import metricRoutes from "./metrics.routes.js";

const api = Router();
api.use("/auth", authRoutes);
api.use("/products", productRoutes);
api.use("/customers", customerRoutes);
api.use("/suppliers", supplierRoutes);
api.use("/inventory", inventoryRoutes);
api.use("/orders", orderRoutes);
api.use("/analytics", metricRoutes);

export default api;