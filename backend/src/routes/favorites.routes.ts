import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../core/auth/index.js';
import { validate } from '../middleware/validate.js';
import { NotFoundError, ValidationError } from '../core/error-handler/index.js';
import { logger } from '../core/logger/index.js';

const prisma = new PrismaClient();
const router = Router();

router.use(authenticate);

const addFavoriteSchema = z.object({
  videoJobId: z.string().uuid('Invalid job ID'),
});

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const favorites = await prisma.userFavorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        videoJob: {
          select: {
            id: true,
            prompt: true,
            provider: true,
            status: true,
            resultUrl: true,
            thumbnailUrl: true,
            duration: true,
            createdAt: true,
          },
        },
      },
    });

    res.json({
      status: 'success',
      data: {
        favorites: favorites.map((f) => ({
          id: f.id,
          createdAt: f.createdAt,
          video: f.videoJob,
        })),
        total: favorites.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', validate(addFavoriteSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { videoJobId } = req.body;
    const userId = req.user!.userId;

    const job = await prisma.videoJob.findUnique({
      where: { id: videoJobId },
      select: { id: true, userId: true },
    });

    if (!job) {
      throw new NotFoundError(`Video job ${videoJobId} not found`);
    }

    const existing = await prisma.userFavorite.findUnique({
      where: { userId_videoJobId: { userId, videoJobId } },
    });

    if (existing) {
      throw new ValidationError('Video is already in your favorites');
    }

    const favorite = await prisma.userFavorite.create({
      data: { userId, videoJobId },
      include: {
        videoJob: {
          select: {
            id: true, prompt: true, provider: true, status: true,
            thumbnailUrl: true, createdAt: true,
          },
        },
      },
    });

    logger.info(`Favorite added`, { userId, videoJobId });

    res.status(201).json({
      status: 'success',
      data: { favorite },
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:jobId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;
    const userId = req.user!.userId;

    const existing = await prisma.userFavorite.findUnique({
      where: { userId_videoJobId: { userId, videoJobId: jobId } },
    });

    if (!existing) {
      throw new NotFoundError(`Favorite not found for video job ${jobId}`);
    }

    await prisma.userFavorite.delete({
      where: { userId_videoJobId: { userId, videoJobId: jobId } },
    });

    logger.info(`Favorite removed`, { userId, videoJobId: jobId });

    res.json({
      status: 'success',
      message: 'Favorite removed successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
