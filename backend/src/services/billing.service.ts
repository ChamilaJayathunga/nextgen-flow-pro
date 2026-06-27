import { PrismaClient } from '@prisma/client';
import { logger } from '../core/logger/index.js';
import { ValidationError } from '../core/error-handler/index.js';

const prisma = new PrismaClient();

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  credits: number;
  features: string[];
  maxDuration: number;
  maxResolution: string;
  concurrentJobs: number;
  providers: string[];
}

interface CostEstimate {
  provider: string;
  baseCost: number;
  durationCost: number;
  resolutionMultiplier: number;
  styleMultiplier: number;
  imageMultiplier: number;
  videoRefMultiplier: number;
  totalCost: number;
  creditsEquivalent: number;
  planAllowance: {
    plan: string;
    included: boolean;
    remainingCredits?: number;
    wouldExceedCredits: boolean;
  };
}

export class BillingService {
  private readonly plans: PricingPlan[] = [
    {
      id: 'free',
      name: 'Free',
      description: 'Basic video generation for testing and exploration',
      price: 0,
      credits: 50,
      features: [
        'Up to 5 seconds video duration',
        '720p resolution',
        '1 concurrent job',
        'Basic providers only',
        'Watermark on exports',
        'Community support',
      ],
      maxDuration: 5,
      maxResolution: '720p',
      concurrentJobs: 1,
      providers: ['kling', 'pixverse', 'fal'],
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'Professional video generation for content creators',
      price: 29,
      credits: 500,
      features: [
        'Up to 30 seconds video duration',
        '1080p resolution',
        '5 concurrent jobs',
        'All providers',
        'No watermark',
        'Priority support',
        'Prompt templates library',
        'Batch processing',
      ],
      maxDuration: 30,
      maxResolution: '1080p',
      concurrentJobs: 5,
      providers: ['googleFlow', 'openai', 'runway', 'pika', 'luma', 'kling', 'pixverse', 'hailuo', 'stability', 'replicate', 'fal'],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'Enterprise-grade video generation with full control',
      price: 99,
      credits: 5000,
      features: [
        'Up to 120 seconds video duration',
        '4K resolution',
        'Unlimited concurrent jobs',
        'All providers with priority',
        'No watermark',
        'Dedicated support',
        'Custom model fine-tuning',
        'API access with rate limits',
        'SSO integration',
        'Custom provider configurations',
        'Advanced analytics',
        'SLA guarantee',
      ],
      maxDuration: 120,
      maxResolution: '4k',
      concurrentJobs: -1,
      providers: ['googleFlow', 'openai', 'runway', 'pika', 'luma', 'kling', 'pixverse', 'hailuo', 'stability', 'replicate', 'fal'],
    },
  ];

  estimateCost(
    provider: string,
    options: {
      duration?: number;
      resolution?: string;
      style?: string;
      imageUrl?: string;
      videoRefUrl?: string;
    } = {},
  ): CostEstimate {
    const duration = options.duration ?? 5;
    const resolution = options.resolution ?? '720p';
    const baseCost = this.getBaseRate(provider);
    const durationCost = duration * 0.02;

    let resolutionMultiplier = 1;
    if (resolution === '1080p') {
      resolutionMultiplier = 1.5;
    } else if (resolution === '4k') {
      resolutionMultiplier = 3;
    }

    const styleMultiplier = options.style ? 1.1 : 1;
    const imageMultiplier = options.imageUrl ? 1.2 : 1;
    const videoRefMultiplier = options.videoRefUrl ? 1.3 : 1;

    const totalCost =
      (baseCost + durationCost) *
      resolutionMultiplier *
      styleMultiplier *
      imageMultiplier *
      videoRefMultiplier;

    const roundedCost = Math.round(totalCost * 100) / 100;
    const creditsEquivalent = Math.ceil(roundedCost * 100);

    const planAllowance = this.getPlanAllowance('free', roundedCost);

    return {
      provider,
      baseCost,
      durationCost,
      resolutionMultiplier,
      styleMultiplier,
      imageMultiplier,
      videoRefMultiplier,
      totalCost: roundedCost,
      creditsEquivalent,
      planAllowance,
    };
  }

  private getBaseRate(provider: string): number {
    const rates: Record<string, number> = {
      googleFlow: 0.05,
      openai: 0.08,
      runway: 0.06,
      pika: 0.04,
      luma: 0.07,
      kling: 0.03,
      pixverse: 0.02,
      hailuo: 0.04,
      stability: 0.06,
      replicate: 0.05,
      fal: 0.03,
    };
    return rates[provider] ?? 0.05;
  }

  async getUserCredits(userId: string): Promise<{
    plan: string;
    credits: number;
    usedCredits: number;
    remainingCredits: number;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, credits: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const usedCredits = await prisma.videoJob.aggregate({
      where: { userId },
      _sum: { cost: true },
    });

    const usedCreditsAmount = Math.ceil((usedCredits._sum.cost ?? 0) * 100);

    return {
      plan: user.plan.toLowerCase(),
      credits: user.credits,
      usedCredits: usedCreditsAmount,
      remainingCredits: Math.max(0, user.credits - usedCreditsAmount),
    };
  }

  async deductCredits(userId: string, amount: number): Promise<{
    success: boolean;
    remainingCredits: number;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, credits: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.credits < amount) {
      throw new ValidationError(
        `Insufficient credits. Required: ${amount}, Available: ${user.credits}`,
      );
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        credits: { decrement: amount },
      },
      select: { credits: true },
    });

    logger.info(`Credits deducted from user ${userId}`, {
      amount,
      remaining: updated.credits,
    });

    return {
      success: true,
      remainingCredits: updated.credits,
    };
  }

  async addCredits(userId: string, amount: number): Promise<{
    success: boolean;
    totalCredits: number;
  }> {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        credits: { increment: amount },
      },
      select: { credits: true },
    });

    logger.info(`Credits added to user ${userId}`, {
      amount,
      total: updated.credits,
    });

    return {
      success: true,
      totalCredits: updated.credits,
    };
  }

  getPricingPlans(): PricingPlan[] {
    return this.plans;
  }

  getPlanByName(planName: string): PricingPlan | undefined {
    return this.plans.find((p) => p.id === planName.toLowerCase());
  }

  private getPlanAllowance(
    planName: string,
    cost: number,
  ): CostEstimate['planAllowance'] {
    const plan = this.getPlanByName(planName);
    if (!plan) {
      return {
        plan: planName,
        included: false,
        wouldExceedCredits: true,
      };
    }

    const creditsNeeded = Math.ceil(cost * 100);
    const remainingCredits = plan.credits - 0;

    return {
      plan: plan.name,
      included: creditsNeeded <= plan.credits,
      remainingCredits: Math.max(0, remainingCredits),
      wouldExceedCredits: creditsNeeded > remainingCredits,
    };
  }

  canGenerate(
    userId: string,
    options: {
      duration: number;
      resolution: string;
      provider: string;
    },
  ): Promise<{
    allowed: boolean;
    reason?: string;
    requiredCredits: number;
    planLimits: { maxDuration: number; maxResolution: string };
  }> {
    return this.checkGenerationLimits(userId, options);
  }

  private async checkGenerationLimits(
    userId: string,
    options: {
      duration: number;
      resolution: string;
      provider: string;
    },
  ): Promise<{
    allowed: boolean;
    reason?: string;
    requiredCredits: number;
    planLimits: { maxDuration: number; maxResolution: string };
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, credits: true },
    });

    if (!user) {
      return {
        allowed: false,
        reason: 'User not found',
        requiredCredits: 0,
        planLimits: { maxDuration: 0, maxResolution: '' },
      };
    }

    const plan = this.getPlanByName(user.plan);
    if (!plan) {
      return {
        allowed: false,
        reason: `Invalid plan: ${user.plan}`,
        requiredCredits: 0,
        planLimits: { maxDuration: 0, maxResolution: '' },
      };
    }

    if (options.duration > plan.maxDuration) {
      return {
        allowed: false,
        reason: `Duration ${options.duration}s exceeds plan limit of ${plan.maxDuration}s`,
        requiredCredits: 0,
        planLimits: { maxDuration: plan.maxDuration, maxResolution: plan.maxResolution },
      };
    }

    const resMap: Record<string, number> = { '720p': 1, '1080p': 2, '4k': 3 };
    const planResLevel = resMap[plan.maxResolution] ?? 1;
    const reqResLevel = resMap[options.resolution] ?? 1;

    if (reqResLevel > planResLevel) {
      return {
        allowed: false,
        reason: `Resolution ${options.resolution} exceeds plan limit of ${plan.maxResolution}`,
        requiredCredits: 0,
        planLimits: { maxDuration: plan.maxDuration, maxResolution: plan.maxResolution },
      };
    }

    if (!plan.providers.includes(options.provider)) {
      return {
        allowed: false,
        reason: `Provider ${options.provider} not available on ${plan.name} plan`,
        requiredCredits: 0,
        planLimits: { maxDuration: plan.maxDuration, maxResolution: plan.maxResolution },
      };
    }

    const estimate = this.estimateCost(options.provider, options);
    const creditsNeeded = estimate.creditsEquivalent;

    if (user.credits < creditsNeeded) {
      return {
        allowed: false,
        reason: `Insufficient credits. Need ${creditsNeeded}, have ${user.credits}`,
        requiredCredits: creditsNeeded,
        planLimits: { maxDuration: plan.maxDuration, maxResolution: plan.maxResolution },
      };
    }

    return {
      allowed: true,
      requiredCredits: creditsNeeded,
      planLimits: { maxDuration: plan.maxDuration, maxResolution: plan.maxResolution },
    };
  }
}

export const billingService = new BillingService();
