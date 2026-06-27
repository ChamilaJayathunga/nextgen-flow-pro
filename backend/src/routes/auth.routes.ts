import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import {
  generateToken,
  hashPassword,
  comparePassword,
  authenticate,
  AuthRequest,
} from '../core/auth/index.js';
import { validate } from '../middleware/validate.js';
import { ValidationError, AuthenticationError, NotFoundError } from '../core/error-handler/index.js';
import { logger } from '../core/logger/index.js';

const prisma = new PrismaClient();
const router = Router();

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email('Invalid email address').optional(),
  image: z.string().url('Invalid image URL').optional().nullable(),
});

router.post('/register', validate(registerSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ValidationError('Email already registered', { email: ['Email is already in use'] });
    }

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
      select: { id: true, name: true, email: true, role: true, plan: true, createdAt: true },
    });

    const token = generateToken({ userId: user.id, email: user.email, role: user.role });

    logger.info(`User registered: ${user.email}`, { userId: user.id });

    res.status(201).json({
      status: 'success',
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', validate(loginSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    const token = generateToken({ userId: user.id, email: user.email, role: user.role });

    const { password: _, ...userData } = user;

    logger.info(`User logged in: ${user.email}`, { userId: user.id });

    res.json({
      status: 'success',
      data: { user: userData, token },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (_req: AuthRequest, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  res.json({
    status: 'success',
    message: 'Logged out successfully',
  });
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true, name: true, email: true, role: true, plan: true,
        credits: true, image: true, emailVerified: true,
        createdAt: true, updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

router.put('/me', authenticate, validate(updateProfileSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, email, image } = req.body;

    if (email) {
      const existing = await prisma.user.findFirst({
        where: { email, id: { not: req.user!.userId } },
      });
      if (existing) {
        throw new ValidationError('Email already in use', { email: ['This email is already taken'] });
      }
    }

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { ...(name !== undefined && { name }), ...(email !== undefined && { email }), ...(image !== undefined && { image }) },
      select: { id: true, name: true, email: true, role: true, plan: true, image: true, updatedAt: true },
    });

    logger.info(`User profile updated: ${user.id}`);

    res.json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
