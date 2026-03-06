import Joi from 'joi';

export enum Env {
  NODE_ENV = 'NODE_ENV',

  PORT = 'PORT',
  FRONTEND_ORIGIN = 'FRONTEND_ORIGIN',

  API_PREFIX = 'API_PREFIX',
  API_VERSION = 'API_VERSION',

  CLERK_WEBHOOK_SECRET = 'CLERK_WEBHOOK_SECRET',
  CLERK_PUBLISHABLE_KEY = 'CLERK_PUBLISHABLE_KEY',
  CLERK_SECRET_KEY = 'CLERK_SECRET_KEY',

  DATABASE_URL = 'DATABASE_URL',
  REDIS_URL = 'REDIS_URL',
  REDIS_NAMESPACE = 'REDIS_NAMESPACE',

  THROTTLE_TTL = 'THROTTLE_TTL',
  THROTTLE_LIMIT = 'THROTTLE_LIMIT',

  GEMINI_API_KEY = 'GEMINI_API_KEY',
  GEMINI_LIVE_MODEL = 'GEMINI_LIVE_MODEL',
}

export const validationSchema = Joi.object({
  [Env.NODE_ENV]: Joi.string().optional(),
  [Env.PORT]: Joi.number().required(),
  [Env.FRONTEND_ORIGIN]: Joi.string().required(),
  [Env.API_PREFIX]: Joi.string().default('api'),
  [Env.API_VERSION]: Joi.string().default('1'),
  [Env.CLERK_WEBHOOK_SECRET]: Joi.string().required(),
  [Env.CLERK_PUBLISHABLE_KEY]: Joi.string().required(),
  [Env.CLERK_SECRET_KEY]: Joi.string().required(),
  [Env.DATABASE_URL]: Joi.string().required(),
  [Env.REDIS_URL]: Joi.string().required(),
  [Env.REDIS_NAMESPACE]: Joi.string().default('cv-builder'),
  [Env.THROTTLE_TTL]: Joi.number().default(60000),
  [Env.THROTTLE_LIMIT]: Joi.number().default(10),
  [Env.GEMINI_API_KEY]: Joi.string().required(),
  [Env.GEMINI_LIVE_MODEL]: Joi.string().default(
    'gemini-2.5-flash-native-audio-preview-12-2025',
  ),
});
