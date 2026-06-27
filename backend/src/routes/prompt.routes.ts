import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, optionalAuth, AuthRequest } from '../core/auth/index.js';
import { validate, validateQuery } from '../middleware/validate.js';
import { PrismaClient } from '@prisma/client';
import { promptService } from '../services/prompt.service.js';
import { NotFoundError } from '../core/error-handler/index.js';
import { logger } from '../core/logger/index.js';

const prisma = new PrismaClient();

const router = Router();

const enhanceSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(5000),
});

const storyboardSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(5000),
});

const templateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required').max(10000),
  category: z.string().max(100).optional(),
  isPublic: z.boolean().optional().default(true),
});

const templateUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(10000).optional(),
  category: z.string().max(100).optional().nullable(),
  isPublic: z.boolean().optional(),
});

const templateQuerySchema = z.object({
  category: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

router.post('/enhance', optionalAuth, validate(enhanceSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { prompt } = req.body;
    const result = await promptService.enhancePrompt(prompt);

    logger.info(`Prompt enhanced`, {
      userId: req.user?.userId,
      originalLength: prompt.length,
    });

    res.json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/storyboard', optionalAuth, validate(storyboardSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { prompt } = req.body;
    const result = await promptService.generateStoryboard(prompt);

    res.json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/templates', optionalAuth, validateQuery(templateQuerySchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { category, page, limit } = req.query as unknown as {
      category?: string; page: number; limit: number;
    };

    const result = await promptService.getTemplates({
      category,
      isPublic: true,
      page,
      limit,
    });

    res.json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/templates', authenticate, validate(templateSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, content, category, isPublic } = req.body;

    const template = await promptService.saveTemplate({
      title,
      content,
      category,
      userId: req.user!.userId,
      isPublic,
    });

    res.status(201).json({
      status: 'success',
      data: { template },
    });
  } catch (error) {
    next(error);
  }
});

router.put('/templates/:id', authenticate, validate(templateUpdateSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existing = await prisma.promptTemplate.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Prompt template ${id} not found`);
    }

    if (existing.userId && existing.userId !== req.user!.userId) {
      throw new NotFoundError(`Prompt template ${id} not found`);
    }

    const updated = await prisma.promptTemplate.update({
      where: { id },
      data: {
        ...(updateData.title !== undefined && { title: updateData.title }),
        ...(updateData.content !== undefined && { content: updateData.content }),
        ...(updateData.category !== undefined && { category: updateData.category }),
        ...(updateData.isPublic !== undefined && { isPublic: updateData.isPublic }),
      },
      select: {
        id: true, title: true, content: true, category: true,
        isPublic: true, createdAt: true, updatedAt: true,
      },
    });

    logger.info(`Prompt template updated`, { templateId: id, userId: req.user!.userId });

    res.json({
      status: 'success',
      data: { template: updated },
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/templates/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await promptService.deleteTemplate(req.params.id, req.user!.userId);

    res.json({
      status: 'success',
      message: 'Template deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
