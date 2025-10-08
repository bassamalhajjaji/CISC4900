import Joi from "joi";

export function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        error: "ValidationError",
        details: error.details.map(d => d.message)
      });
    }
    req.body = value;
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        error: "ValidationError",
        details: error.details.map(d => d.message)
      });
    }
    req.query = value;
    next();
  };
}