import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

export const config = {
  port: parseInt(optionalEnv('PORT', '3000'), 10),
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  corsOrigin: optionalEnv('CORS_ORIGIN', 'http://localhost:5173'),
  logLevel: optionalEnv('LOG_LEVEL', 'debug'),
  uploadDir: optionalEnv('UPLOAD_DIR', './uploads'),

  database: {
    url: requiredEnv('DATABASE_URL'),
  },

  redis: {
    url: requiredEnv('REDIS_URL'),
  },

  jwt: {
    secret: requiredEnv('JWT_SECRET'),
    expiresIn: optionalEnv('JWT_EXPIRES_IN', '7d'),
  },

  rateLimit: {
    window: parseInt(optionalEnv('RATE_LIMIT_WINDOW', '15'), 10),
    max: parseInt(optionalEnv('RATE_LIMIT_MAX', '100'), 10),
  },

  providers: {
    googleFlow: { apiKey: optionalEnv('GOOGLE_FLOW_API_KEY', ''), baseUrl: 'https://flow.google.com/v1' },
    openai: { apiKey: optionalEnv('OPENAI_API_KEY', ''), baseUrl: 'https://api.openai.com/v1' },
    runway: { apiKey: optionalEnv('RUNWAY_API_KEY', ''), baseUrl: 'https://api.runwayml.com/v1' },
    pika: { apiKey: optionalEnv('PIKA_API_KEY', ''), baseUrl: 'https://api.pika.art/v1' },
    luma: { apiKey: optionalEnv('LUMA_API_KEY', ''), baseUrl: 'https://api.lumalabs.ai/v1' },
    kling: { apiKey: optionalEnv('KLING_API_KEY', ''), baseUrl: 'https://api.klingai.com/v1' },
    pixverse: { apiKey: optionalEnv('PIXVERSE_API_KEY', ''), baseUrl: 'https://api.pixverse.ai/v1' },
    hailuo: { apiKey: optionalEnv('HAILUO_API_KEY', ''), baseUrl: 'https://api.hailuoai.com/v1' },
    stability: { apiKey: optionalEnv('STABILITY_API_KEY', ''), baseUrl: 'https://api.stability.ai/v1' },
    replicate: { apiKey: optionalEnv('REPLICATE_API_KEY', ''), baseUrl: 'https://api.replicate.com/v1' },
    fal: { apiKey: optionalEnv('FAL_API_KEY', ''), baseUrl: 'https://api.fal.ai/v1' },
  },
} as const;

export type Config = typeof config;
