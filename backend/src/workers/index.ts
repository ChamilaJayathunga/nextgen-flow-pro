import { startVideoWorker } from './video.worker.js';
import { logger } from '../core/logger/index.js';

export function startAllWorkers(): void {
  logger.info('Starting all queue workers...');

  startVideoWorker();

  logger.info('All workers started successfully');
}
