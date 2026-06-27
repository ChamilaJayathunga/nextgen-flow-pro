import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../core/auth/index.js';
import { validate } from '../middleware/validate.js';
import { billingService } from '../services/billing.service.js';
import { ValidationError } from '../core/error-handler/index.js';
import { logger } from '../core/logger/index.js';

const prisma = new PrismaClient();

const router = Router();

const purchaseCreditsSchema = z.object({
  amount: z.number().int().positive('Amount must be positive').max(100000),
  paymentMethod: z.string().optional(),
});

const subscribeSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
});

router.get('/plans', (_req: AuthRequest, res: Response) => {
  const plans = billingService.getPricingPlans();

  res.json({
    status: 'success',
    data: { plans },
  });
});

router.get('/credits', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const credits = await billingService.getUserCredits(req.user!.userId);

    res.json({
      status: 'success',
      data: { credits },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/credits', authenticate, validate(purchaseCreditsSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { amount } = req.body;

    const result = await billingService.addCredits(req.user!.userId, amount);

    logger.info(`Credits purchased`, {
      userId: req.user!.userId,
      amount,
      total: result.totalCredits,
    });

    res.json({
      status: 'success',
      data: {
        credits: result,
        message: `Successfully purchased ${amount} credits`,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/subscribe', authenticate, validate(subscribeSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { planId } = req.body;
    const plan = billingService.getPlanByName(planId);

    if (!plan) {
      throw new ValidationError(`Invalid plan: ${planId}`, {
        planId: [`Plan "${planId}" does not exist`],
      });
    }

    const planMap: Record<string, string> = {
      free: 'FREE',
      pro: 'PRO',
      enterprise: 'ENTERPRISE',
    };

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        plan: planMap[planId.toLowerCase()] ?? 'FREE',
        credits: { increment: plan.credits },
      },
      select: { id: true, plan: true, credits: true },
    });

    logger.info(`User subscribed to plan`, {
      userId: req.user!.userId,
      plan: planId,
    });

    res.json({
      status: 'success',
      data: {
        user,
        plan: {
          id: plan.id,
          name: plan.name,
          credits: plan.credits,
          features: plan.features,
        },
        message: `Successfully subscribed to ${plan.name} plan`,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
