import Joi from "joi";

export const productCreateSchema = Joi.object({
  sku: Joi.string().max(60).required(),
  name: Joi.string().max(150).required(),
  category_id: Joi.number().integer().required(),
  supplier_id: Joi.number().integer().allow(null),
  unit_price: Joi.number().precision(2).required(),
  cost_price: Joi.number().precision(2).required(),
  reorder_level: Joi.number().integer().min(0).default(10),
  qty_on_hand: Joi.number().integer().min(0).default(0)
});

export const customerCreateSchema = Joi.object({
  full_name: Joi.string().max(150).required(),
  email: Joi.string().email().allow(null, ""),
  phone: Joi.string().max(40).allow(null, "")
});

export const supplierCreateSchema = Joi.object({
  name: Joi.string().max(150).required(),
  email: Joi.string().email().allow(null, ""),
  phone: Joi.string().max(40).allow(null, ""),
  address: Joi.string().max(255).allow(null, "")
});

export const inventoryAdjustSchema = Joi.object({
  product_id: Joi.number().integer().required(),
  delta_qty: Joi.number().integer().required(),
  reason: Joi.string().valid('ADJUSTMENT','RETURN_IN','RETURN_OUT').default('ADJUSTMENT'),
  note: Joi.string().max(255).allow('', null)
});

export const orderCreateSchema = Joi.object({
  customer_id: Joi.number().integer().allow(null),
  items: Joi.array().items(Joi.object({
    product_id: Joi.number().integer().required(),
    qty: Joi.number().integer().min(1).required(),
    unit_price: Joi.number().precision(2).required()
  })).min(1).required(),
  tax_rate: Joi.number().precision(4).min(0).default(0.00),
  discount: Joi.number().precision(2).min(0).default(0),
  payment: Joi.object({
    method: Joi.string().valid('CASH','CARD','OTHER').required(),
    amount: Joi.number().precision(2).required()
  }).required()
});

export const analyticsDailySchema = Joi.object({
  days: Joi.number().integer().min(1).max(90).default(7)
});