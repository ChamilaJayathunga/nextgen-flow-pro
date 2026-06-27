import { config } from '../config/index.js';
import { logger } from '../logger/index.js';

export enum JobType {
  VIDEO_GENERATION = 'video-generation',
  PROMPT_ENHANCEMENT = 'prompt-enhancement',
  THUMBNAIL_GENERATION = 'thumbnail-generation',
}

export enum QueueName {
  VIDEO_GENERATION = 'video-generation-queue',
  PROMPT_ENHANCEMENT = 'prompt-enhancement-queue',
  THUMBNAIL_GENERATION = 'thumbnail-generation-queue',
}

interface JobData {
  type: JobType;
  userId: string;
  jobId: string;
  payload: Record<string, unknown>;
}

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

type JobProcessor = (job: { id: string; data: JobData; updateProgress: (pct: number) => Promise<void>; attemptsMade: number }) => Promise<void>;

export class QueueService {
  private initialized = false;
  private bullQueue: any = null;
  private bullWorker: any = null;

  constructor() {
    this.tryInit();
  }

  private tryInit(): void {
    try {
      const { Queue, Worker } = require('bullmq');
      const connection = {
        url: config.redis.url,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      };
      const defaultJobOptions = {
        attempts: 3,
        backoff: { type: 'exponential' as const, delay: 2000 },
        removeOnComplete: { age: 3600 * 24, count: 100 },
        removeOnFail: { age: 3600 * 48 },
      };
      this.bullQueue = Queue;
      this.bullWorker = Worker;
      this.queues = Object.values(QueueName).reduce((map, name) => {
        map.set(name, new Queue(name, { connection, defaultJobOptions }));
        return map;
      }, new Map());
      this.initialized = true;
      logger.info('BullMQ queues initialized with Redis');
    } catch {
      logger.warn('Redis not available - running in direct mode (no queue)');
      this.initialized = false;
      this.queues = new Map();
    }
  }

  private queues: Map<string, any> = new Map();

  isAvailable(): boolean {
    return this.initialized;
  }

  async addJob(
    queueName: QueueName,
    jobType: JobType,
    data: JobData,
    priority?: number,
    delay?: number,
  ): Promise<any> {
    if (!this.initialized) {
      logger.info(`Direct mode: job queued for ${queueName}`, { type: jobType, jobId: data.jobId });
      return { id: data.jobId, data };
    }
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);
    return queue.add(jobType, data, { priority: priority ?? 0, delay: delay ?? 0 });
  }

  async getJobStatus(queueName: QueueName, jobId: string): Promise<any> {
    if (!this.initialized) return null;
    const queue = this.queues.get(queueName);
    if (!queue) return null;
    return queue.getJob(jobId);
  }

  async getQueueStats(_queueName: QueueName): Promise<QueueStats> {
    return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: false };
  }

  async pauseQueue(_queueName: QueueName): Promise<void> {
    logger.info('Queue pause unavailable (no Redis)');
  }

  async resumeQueue(_queueName: QueueName): Promise<void> {
    logger.info('Queue resume unavailable (no Redis)');
  }

  async getQueue(queueName: QueueName): Promise<any> {
    if (!this.initialized) return null;
    return this.queues.get(queueName);
  }

  createWorker(
    queueName: QueueName,
    processor: JobProcessor,
    concurrency = 5,
  ): any {
    if (!this.initialized) {
      logger.info(`Direct mode: worker registered for ${queueName}`);
      return {
        on: () => {},
        close: async () => {},
      };
    }
    const Worker = this.bullWorker;
    const connection = { url: config.redis.url, maxRetriesPerRequest: null, enableReadyCheck: false };
    const worker = new Worker(queueName, processor, {
      connection,
      concurrency,
      lockDuration: 30000,
      stalledInterval: 30000,
      maxStalledCount: 3,
    });
    logger.info(`Worker created for ${queueName} with concurrency ${concurrency}`);
    return worker;
  }

  async close(): Promise<void> {
    if (this.initialized) {
      const promises: Promise<void>[] = [];
      this.queues.forEach((q: any) => promises.push(q.close()));
      await Promise.all(promises);
    }
    logger.info('All queues closed');
  }
}

export const queueService = new QueueService();
