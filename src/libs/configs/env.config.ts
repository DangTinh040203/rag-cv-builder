import Joi from 'joi';

export enum Env {
  PORT = 'PORT',
  FRONTEND_ORIGIN = 'FRONTEND_ORIGIN',
  CLERK_WEBHOOK_SECRET = 'CLERK_WEBHOOK_SECRET',
  CLERK_PUBLISHABLE_KEY = 'CLERK_PUBLISHABLE_KEY',
  CLERK_SECRET_KEY = 'CLERK_SECRET_KEY',
}

export const validationSchema = Joi.object({
  [Env.PORT]: Joi.number().required(),
  [Env.FRONTEND_ORIGIN]: Joi.string().required(),
  [Env.CLERK_WEBHOOK_SECRET]: Joi.string().required(),
  [Env.CLERK_PUBLISHABLE_KEY]: Joi.string().required(),
  [Env.CLERK_SECRET_KEY]: Joi.string().required(),
});
