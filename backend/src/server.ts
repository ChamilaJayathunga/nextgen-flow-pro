import http from 'http';
import { PrismaClient } from '@prisma/client';
import app from './app.js';
import { config } from './core/config/index.js';
import { logger } from './core/logger/index.js';
import { initSocketIO } from './websocket/index.js';
import { startAllWorkers } from './workers/index.js';
import { providerRegistry } from './providers/registry.js';

const prisma = new PrismaClient();
const server = http.createServer(app);

async function registerAllProviders(): Promise<void> {
  logger.info('Registering all providers...');

  const providerModules = [
    { name: 'openai', path: './providers/openai/index.js' },
    { name: 'googleFlow', path: './providers/google-flow/index.js' },
    { name: 'runway', path: './providers/runway/index.js' },
    { name: 'pika', path: './providers/pika/index.js' },
    { name: 'luma', path: './providers/luma/index.js' },
    { name: 'kling', path: './providers/kling/index.js' },
    { name: 'pixverse', path: './providers/pixverse/index.js' },
    { name: 'hailuo', path: './providers/hailuo/index.js' },
    { name: 'stability', path: './providers/stability/index.js' },
    { name: 'replicate', path: './providers/replicate/index.js' },
    { name: 'fal', path: './providers/fal/index.js' },
  ];

  const results = await Promise.allSettled(
    providerModules.map(async ({ name, path }) => {
      try {
        const mod: any = await import(path);
        const ProviderClass = mod.default;
        if (ProviderClass && typeof ProviderClass === 'function') {
          const providerConfig = (config.providers as Record<string, unknown>)[name] as Record<string, string>;
          const instance = new ProviderClass(providerConfig);
          providerRegistry.register(instance);
          logger.info(`Provider registered: ${name}`);
        } else {
          logger.warn(`Provider ${name} has no default export class`);
        }
      } catch (err) {
        logger.error(`Failed to register provider ${name}`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }),
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  logger.info(`Provider registration complete: ${succeeded}/${providerModules.length}`);
}

async function start(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');

    await registerAllProviders();

    const io = initSocketIO(server);
    logger.info('WebSocket server initialized');

    startAllWorkers();

    server.listen(config.port, () => {
      logger.info(`Server started`, {
        port: config.port,
        environment: config.nodeEnv,
        apiDocs: `http://localhost:${config.port}/api-docs`,
        healthEndpoint: `http://localhost:${config.port}/health`,
      });

      console.log(`
  ╔══════════════════════════════════════════════╗
  ║          NextGen Flow Pro Server             ║
  ╠══════════════════════════════════════════════╣
  ║  Port:       ${String(config.port).padEnd(30)} ║
  ║  Env:        ${config.nodeEnv.padEnd(30)} ║
  ║  API Docs:   http://localhost:${config.port}/api-docs  ║
  ║  Health:     http://localhost:${config.port}/health    ║
  ╚══════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  logger.info('Shutting down gracefully...');

  server.close(async () => {
    try {
      await prisma.$disconnect();
      logger.info('Database disconnected');
    } catch (error) {
      logger.error('Error disconnecting database', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();

export { app, server };
