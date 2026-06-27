import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger/index.js';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  public readonly details?: Record<string, string[]>;

  constructor(message = 'Validation failed', details?: Record<string, string[]>) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

export class ProviderError extends AppError {
  public readonly provider: string;

  constructor(message: string, provider: string, statusCode = 502) {
    super(message, statusCode, 'PROVIDER_ERROR');
    this.provider = provider;
  }
}

export class QueueError extends AppError {
  constructor(message: string) {
    super(message, 500, 'QUEUE_ERROR');
  }
}

interface ErrorResponse {
  status: 'error';
  message: string;
  code: string;
  details?: Record<string, string[]>;
  stack?: string;
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      status: 'error',
      message: err.message,
      code: err.code,
    };

    if (err instanceof ValidationError && err.details) {
      response.details = err.details;
    }

    if (process.env.NODE_ENV === 'development') {
      response.stack = err.stack;
    }

    if (!err.isOperational) {
      logger.error('Non-operational error encountered', {
        error: err.message,
        stack: err.stack,
        code: err.code,
      });
    }

    res.status(err.statusCode).json(response);
    return;
  }

  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
  });

  const response: ErrorResponse = {
    status: 'error',
    message: 'Internal server error',
    code: 'INTERNAL_ERROR',
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(500).json(response);
}

export function handleUnhandledRejections(): void {
  process.on('unhandledRejection', (reason: Error | unknown) => {
    logger.error('Unhandled Rejection', {
      error: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });

  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });
}
