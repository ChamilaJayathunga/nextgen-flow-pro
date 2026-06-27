import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { config } from './core/config/index.js';
import { errorHandler, handleUnhandledRejections } from './core/error-handler/index.js';
import { LoggerStream } from './core/logger/index.js';
import { registerRoutes } from './routes/index.js';
import { createRateLimiter } from './middleware/rateLimiter.js';

const app = express();

handleUnhandledRejections();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(morgan('combined', {
  stream: new LoggerStream(),
  skip: (_req, res) => res.statusCode < 400,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use('/uploads', express.static(path.resolve(config.uploadDir)));

app.use(createRateLimiter({
  windowMs: config.rateLimit.window * 60 * 1000,
  max: config.rateLimit.max,
}));

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'NextGen Flow Pro API',
    version: '1.0.0',
    description: 'AI Video Generation Platform - REST API Documentation',
    contact: {
      name: 'NextGen Flow Pro Support',
      email: 'support@nextgenflowpro.com',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.port}`,
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'error' },
          message: { type: 'string' },
          code: { type: 'string' },
          details: { type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } } },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['USER', 'ADMIN'] },
          plan: { type: 'string', enum: ['FREE', 'PRO', 'ENTERPRISE'] },
          credits: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      VideoJob: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          prompt: { type: 'string' },
          provider: { type: 'string' },
          status: { type: 'string', enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'] },
          progress: { type: 'integer' },
          resultUrl: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {},
};

const swaggerSpec = swaggerJsdoc({
  definition: swaggerDefinition,
  apis: ['./src/routes/*.ts', './dist/routes/*.js'],
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'NextGen Flow Pro API Docs',
}));

app.get('/health', (_req, res) => {
  res.json({
    status: 'success',
    data: {
      service: 'NextGen Flow Pro',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

registerRoutes(app);

app.use(errorHandler);

export default app;
