import { Request, Response, NextFunction } from 'express';
import {
  AppError,
  NotFoundError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  ProviderError,
  QueueError,
  errorHandler,
  handleUnhandledRejections,
} from '../../src/core/error-handler/index';

jest.mock('../../src/core/logger/index', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Error Handler Core', () => {
  describe('AppError Class', () => {
    it('should create an AppError with correct properties', () => {
      const error = new AppError('Something went wrong', 500, 'INTERNAL_ERROR');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Something went wrong');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.isOperational).toBe(true);
    });

    it('should be throwable and catchable', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR');

      expect(() => { throw error; }).toThrow(AppError);
      expect(() => { throw error; }).toThrow('Test error');
    });

    it('should capture stack trace', () => {
      const error = new AppError('Stack trace test', 500, 'STACK_TEST');
      expect(error.stack).toBeDefined();
    });

    it('should allow non-operational errors', () => {
      const error = new AppError('Non-operational', 500, 'FATAL', false);
      expect(error.isOperational).toBe(false);
    });
  });

  describe('Error Subclasses', () => {
    describe('NotFoundError', () => {
      it('should create with default message', () => {
        const error = new NotFoundError();
        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toBe('Resource not found');
        expect(error.statusCode).toBe(404);
        expect(error.code).toBe('NOT_FOUND');
      });

      it('should create with custom message', () => {
        const error = new NotFoundError('User not found');
        expect(error.message).toBe('User not found');
        expect(error.statusCode).toBe(404);
      });
    });

    describe('ValidationError', () => {
      it('should create with default message', () => {
        const error = new ValidationError();
        expect(error.message).toBe('Validation failed');
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe('VALIDATION_ERROR');
      });

      it('should store validation details', () => {
        const details = {
          email: ['Email is required', 'Invalid format'],
          password: ['Minimum 8 characters'],
        };
        const error = new ValidationError('Validation failed', details);

        expect(error.details).toEqual(details);
        expect(error.statusCode).toBe(400);
      });

      it('should create without details', () => {
        const error = new ValidationError('Simple validation error');
        expect(error.details).toBeUndefined();
      });
    });

    describe('AuthenticationError', () => {
      it('should create with default message', () => {
        const error = new AuthenticationError();
        expect(error.message).toBe('Authentication failed');
        expect(error.statusCode).toBe(401);
        expect(error.code).toBe('AUTHENTICATION_ERROR');
      });

      it('should create with custom message', () => {
        const error = new AuthenticationError('Invalid credentials');
        expect(error.message).toBe('Invalid credentials');
      });
    });

    describe('AuthorizationError', () => {
      it('should create with default message', () => {
        const error = new AuthorizationError();
        expect(error.message).toBe('Access denied');
        expect(error.statusCode).toBe(403);
        expect(error.code).toBe('AUTHORIZATION_ERROR');
      });
    });

    describe('RateLimitError', () => {
      it('should create with default message', () => {
        const error = new RateLimitError();
        expect(error.message).toBe('Too many requests');
        expect(error.statusCode).toBe(429);
        expect(error.code).toBe('RATE_LIMIT_ERROR');
      });
    });

    describe('ProviderError', () => {
      it('should create with provider info', () => {
        const error = new ProviderError('API key invalid', 'openai');
        expect(error.message).toBe('API key invalid');
        expect(error.statusCode).toBe(502);
        expect(error.code).toBe('PROVIDER_ERROR');
        expect(error.provider).toBe('openai');
      });

      it('should allow custom status code', () => {
        const error = new ProviderError('Rate limited', 'runway', 429);
        expect(error.statusCode).toBe(429);
        expect(error.provider).toBe('runway');
      });
    });

    describe('QueueError', () => {
      it('should create with message', () => {
        const error = new QueueError('Queue not found');
        expect(error.message).toBe('Queue not found');
        expect(error.statusCode).toBe(500);
        expect(error.code).toBe('QUEUE_ERROR');
      });
    });
  });

  describe('Error Middleware - errorHandler', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: jest.Mock;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
      jsonMock = jest.fn().mockReturnThis();
      statusMock = jest.fn().mockReturnValue({ json: jsonMock });
      mockReq = {};
      mockRes = {
        status: statusMock,
      };
      mockNext = jest.fn();
      process.env.NODE_ENV = 'production';
    });

    it('should handle AppError with correct status and response', () => {
      const error = new NotFoundError('User not found');

      errorHandler(
        error,
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction,
      );

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'User not found',
        code: 'NOT_FOUND',
      });
    });

    it('should include validation details for ValidationError', () => {
      const details = { email: ['Email is required'] };
      const error = new ValidationError('Validation failed', details);

      errorHandler(
        error,
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction,
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: { email: ['Email is required'] },
      });
    });

    it('should include stack trace in development environment', () => {
      process.env.NODE_ENV = 'development';
      const error = new AppError('Dev error', 500, 'DEV_ERROR');

      errorHandler(
        error,
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction,
      );

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Dev error',
          stack: expect.any(String),
        }),
      );
    });

    it('should handle non-AppError as internal server error', () => {
      const error = new Error('Unexpected crash');

      errorHandler(
        error,
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction,
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    });

    it('should handle AuthenticationError', () => {
      const error = new AuthenticationError('Token expired');

      errorHandler(
        error,
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction,
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Token expired',
        code: 'AUTHENTICATION_ERROR',
      });
    });

    it('should handle AuthorizationError', () => {
      const error = new AuthorizationError('Insufficient permissions');

      errorHandler(
        error,
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction,
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Insufficient permissions',
        code: 'AUTHORIZATION_ERROR',
      });
    });

    it('should handle RateLimitError', () => {
      const error = new RateLimitError('Too many requests, slow down');

      errorHandler(
        error,
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction,
      );

      expect(statusMock).toHaveBeenCalledWith(429);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Too many requests, slow down',
        code: 'RATE_LIMIT_ERROR',
      });
    });

    it('should handle ProviderError', () => {
      const error = new ProviderError('Provider unavailable', 'openai');

      errorHandler(
        error,
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction,
      );

      expect(statusMock).toHaveBeenCalledWith(502);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Provider unavailable',
        code: 'PROVIDER_ERROR',
      });
    });

    it('should not expose stack trace in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Sensitive error');

      errorHandler(
        error,
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction,
      );

      const response = jsonMock.mock.calls[0][0];
      expect(response.stack).toBeUndefined();
    });
  });

  describe('handleUnhandledRejections', () => {
    let originalProcessOn: any;

    beforeEach(() => {
      originalProcessOn = process.on;
      process.on = jest.fn() as any;
    });

    afterEach(() => {
      process.on = originalProcessOn;
    });

    it('should register handlers for unhandledRejection and uncaughtException', () => {
      handleUnhandledRejections();

      expect(process.on).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
      expect(process.on).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
    });
  });
});
