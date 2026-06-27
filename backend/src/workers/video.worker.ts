import { queueService, QueueName, JobType } from '../core/queue/index.js';
import { providerService } from '../services/provider.service.js';
import { jobService } from '../services/job.service.js';
import { logger } from '../core/logger/index.js';
import { getIO } from '../websocket/index.js';

interface VideoGenerationPayload {
  prompt: string;
  enhancedPrompt?: string;
  imageUrl?: string;
  provider: string;
  options: Record<string, unknown>;
}

interface VideoJobData {
  type: JobType;
  userId: string;
  jobId: string;
  payload: VideoGenerationPayload;
}

async function processVideoJob(job: { id: string; data: VideoJobData; updateProgress: (pct: number) => Promise<void>; attemptsMade: number }): Promise<void> {
  const { userId, jobId, payload } = job.data;
  const { prompt, enhancedPrompt, imageUrl, provider: providerName, options } = payload;

  const io = getIO();
  const room = `user:${userId}`;

  try {
    await jobService.updateJobStatus(jobId, {
      status: 'PROCESSING',
      startedAt: new Date(),
    });

    if (io) {
      io.to(room).emit('job:update', {
        jobId,
        status: 'PROCESSING',
        progress: 0,
      });
    }

    await job.updateProgress(5);

    const result = await providerService.generateVideo(enhancedPrompt ?? prompt, {
      prompt: enhancedPrompt ?? prompt,
      imageUrl,
      ...options,
      provider: providerName,
    } as any);

    await job.updateProgress(90);

    await jobService.updateJobStatus(jobId, {
      status: 'COMPLETED',
      resultUrl: result.resultUrl,
      thumbnailUrl: result.thumbnailUrl,
      progress: 100,
      duration: result.estimatedDuration,
      cost: result.cost,
      completedAt: new Date(),
    });

    if (io) {
      io.to(room).emit('job:completed', {
        jobId,
        status: 'COMPLETED',
        resultUrl: result.resultUrl,
        thumbnailUrl: result.thumbnailUrl,
        duration: result.estimatedDuration,
        progress: 100,
      });
    }

    logger.info(`Video job ${jobId} completed successfully`, {
      userId,
      provider: providerName,
      resultUrl: result.resultUrl,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await jobService.updateJobStatus(jobId, {
      status: 'FAILED',
      errorMessage,
      completedAt: new Date(),
    });

    if (io) {
      io.to(room).emit('job:failed', {
        jobId,
        status: 'FAILED',
        error: errorMessage,
      });
    }

    logger.error(`Video job ${jobId} failed`, {
      userId,
      provider: providerName,
      error: errorMessage,
      attempts: job.attemptsMade,
    });

    throw error;
  }
}

export function startVideoWorker(): void {
  const worker = queueService.createWorker(
    QueueName.VIDEO_GENERATION,
    processVideoJob,
    3,
  );

  logger.info('Video generation worker started', {
    queue: QueueName.VIDEO_GENERATION,
    concurrency: 3,
  });

  worker.on('completed', (job: any) => {
    logger.info(`Video worker completed job ${job.id}`);
  });

  worker.on('failed', (job: any | undefined, error: Error) => {
    logger.error(`Video worker failed job ${job?.id}`, {
      error: error.message,
      attempts: job?.attemptsMade,
    });
  });
}
