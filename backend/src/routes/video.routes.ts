import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../core/auth/index.js';
import { validate, validateQuery } from '../middleware/validate.js';
import { upload } from '../middleware/upload.js';
import { jobService } from '../services/job.service.js';
import { providerService } from '../services/provider.service.js';
import { promptService } from '../services/prompt.service.js';
import { billingService } from '../services/billing.service.js';
import { queueService, QueueName, JobType } from '../core/queue/index.js';
import { NotFoundError, ValidationError } from '../core/error-handler/index.js';
import { logger } from '../core/logger/index.js';

const prisma = new PrismaClient();
const router = Router();

const generateSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(5000),
  provider: z.string().optional(),
  enhancePrompt: z.boolean().optional(),
  options: z.object({
    duration: z.number().min(1).max(120).optional(),
    resolution: z.enum(['720p', '1080p', '4k']).optional(),
    style: z.string().optional(),
    negativePrompt: z.string().optional(),
  }).optional(),
});

const batchSchema = z.object({
  prompts: z.array(z.string().min(1)).min(1, 'At least one prompt is required').max(50, 'Maximum 50 prompts'),
  provider: z.string().optional(),
  options: z.object({
    duration: z.number().min(1).max(120).optional(),
    resolution: z.enum(['720p', '1080p', '4k']).optional(),
    style: z.string().optional(),
  }).optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']).optional(),
  provider: z.string().optional(),
});

function parseFormJsonFields(req: AuthRequest, _res: Response, next: NextFunction): void {
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        try {
          req.body[key] = JSON.parse(req.body[key]);
        } catch {
          // Not valid JSON, keep as string
        }
      }
    }
  }
  next();
}

router.post('/generate', authenticate, upload.single('image'), parseFormJsonFields, validate(generateSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { prompt, provider: preferredProvider, enhancePrompt: shouldEnhance, options } = req.body;
    const userId = req.user!.userId;

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    let selectedProvider = preferredProvider;
    if (!selectedProvider) {
      selectedProvider = providerService.getBestProvider().name;
    }

    const checkResult = await billingService.canGenerate(userId, {
      duration: options?.duration ?? 5,
      resolution: options?.resolution ?? '720p',
      provider: selectedProvider,
    });

    if (!checkResult.allowed) {
      throw new ValidationError(checkResult.reason ?? 'Generation not allowed');
    }

    let enhancedPrompt: string | undefined;
    if (shouldEnhance) {
      const result = await promptService.enhancePrompt(prompt);
      enhancedPrompt = result.enhanced;
    }

    const job = await jobService.createJob({
      userId,
      prompt,
      provider: selectedProvider,
      enhancedPrompt,
      imageUrl,
      parameters: options as Record<string, unknown> | undefined,
    });

    await billingService.deductCredits(userId, checkResult.requiredCredits);

    await queueService.addJob(
      QueueName.VIDEO_GENERATION,
      JobType.VIDEO_GENERATION,
      {
        type: JobType.VIDEO_GENERATION,
        userId,
        jobId: job.id,
        payload: {
          prompt,
          enhancedPrompt,
          imageUrl,
          provider: selectedProvider,
          options: options ?? {},
        },
      },
    );

    logger.info(`Video generation queued`, { jobId: job.id, userId, provider: selectedProvider });

    res.status(201).json({
      status: 'success',
      data: { job },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/jobs', authenticate, validateQuery(paginationSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit, status, provider } = req.query as unknown as {
      page: number; limit: number; status?: string; provider?: string;
    };

    const result = await jobService.getUserJobs(req.user!.userId, { page, limit, status, provider });

    res.json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/jobs/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const job = await jobService.getJob(req.params.id, req.user!.userId);

    res.json({
      status: 'success',
      data: { job },
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/jobs/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await jobService.deleteJob(req.params.id, req.user!.userId);

    res.json({
      status: 'success',
      message: 'Job deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/jobs/:id/cancel', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const job = await jobService.getJob(req.params.id, req.user!.userId);

    if (job.status === 'COMPLETED' || job.status === 'CANCELLED') {
      throw new ValidationError(`Cannot cancel a job that is already ${job.status.toLowerCase()}`);
    }

    try {
      await providerService.cancelJob(job.provider, job.id);
    } catch {
      logger.warn(`Failed to cancel job on provider ${job.provider}`, { jobId: job.id });
    }

    await jobService.updateJobStatus(job.id, { status: 'CANCELLED' });

    logger.info(`Video job cancelled`, { jobId: job.id, userId: req.user!.userId });

    res.json({
      status: 'success',
      message: 'Job cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/batch', authenticate, validate(batchSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { prompts, provider: preferredProvider, options } = req.body;
    const userId = req.user!.userId;

    const jobs = [];
    for (const prompt of prompts) {
      let selectedProvider = preferredProvider;
      if (!selectedProvider) {
        selectedProvider = providerService.getBestProvider().name;
      }

      const checkResult = await billingService.canGenerate(userId, {
        duration: options?.duration ?? 5,
        resolution: options?.resolution ?? '720p',
        provider: selectedProvider,
      });

      if (!checkResult.allowed) {
        throw new ValidationError(`Cannot generate "${prompt.substring(0, 50)}...": ${checkResult.reason}`);
      }

      const job = await jobService.createJob({
        userId,
        prompt,
        provider: selectedProvider,
        parameters: options as Record<string, unknown> | undefined,
      });

      await billingService.deductCredits(userId, checkResult.requiredCredits);

      await queueService.addJob(
        QueueName.VIDEO_GENERATION,
        JobType.VIDEO_GENERATION,
        {
          type: JobType.VIDEO_GENERATION,
          userId,
          jobId: job.id,
          payload: {
            prompt,
            provider: selectedProvider,
            options: options ?? {},
          },
        },
      );

      jobs.push(job);
    }

    logger.info(`Batch generation queued`, { userId, count: prompts.length });

    res.status(201).json({
      status: 'success',
      data: { jobs, total: jobs.length },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/stats', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await jobService.getJobStats(req.user!.userId);

    res.json({
      status: 'success',
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
