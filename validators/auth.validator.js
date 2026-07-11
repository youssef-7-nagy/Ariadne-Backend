const Joi = require("joi");

const registerSchema = Joi.object({
  name: Joi.string().min(3).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().min(8).max(15).required(),
  password: Joi.string().min(8).max(50).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const forgotSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().required(),
});

const genderSchema = Joi.object({
  gender: Joi.string().valid("male", "female").required(),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotSchema,
  resetSchema,
  genderSchema,
};
