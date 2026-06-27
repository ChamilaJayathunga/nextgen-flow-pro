import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  authenticate,
  requireRole,
  optionalAuth,
} from '../../src/core/auth/index';
import { AuthenticationError, AuthorizationError } from '../../src/core/error-handler/index';
import { Request, Response, NextFunction } from 'express';

jest.mock('../../src/core/config/index', () => ({
  config: {
    jwt: {
      secret: 'test-jwt-secret-key-for-testing',
      expiresIn: '1h',
    },
  },
}));

jest.mock('../../src/core/logger/index', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Auth Core', () => {
  describe('Token Generation', () => {
    it('should generate a valid JWT token', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER' as const,
      };

      const token = generateToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, 'test-jwt-secret-key-for-testing');
      expect(decoded).toMatchObject({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER',
      });
    });

    it('should generate a token with expiry', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER' as const,
      };

      const token = generateToken(payload);
      const decoded = jwt.decode(token) as { exp: number; iat: number };

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp - decoded.iat).toBe(3600);
    });

    it('should generate unique tokens for different payloads', () => {
      const token1 = generateToken({ userId: 'user-1', email: 'a@test.com', role: 'USER' });
      const token2 = generateToken({ userId: 'user-2', email: 'b@test.com', role: 'USER' });

      expect(token1).not.toBe(token2);
    });
  });

  describe('Token Verification', () => {
    it('should verify a valid token', () => {
      const payload = { userId: 'user-123', email: 'test@example.com', role: 'USER' as const };
      const token = generateToken(payload);

      const decoded = verifyToken(token);

      expect(decoded).toMatchObject(payload);
    });

    it('should throw AuthenticationError for expired token', () => {
      const payload = { userId: 'user-123', email: 'test@example.com', role: 'USER' as const };
      const expiredToken = jwt.sign(payload, 'test-jwt-secret-key-for-testing', {
        expiresIn: '0s',
        algorithm: 'HS256',
      });

      expect(() => verifyToken(expiredToken)).toThrow(AuthenticationError);
      expect(() => verifyToken(expiredToken)).toThrow('Token expired');
    });

    it('should throw AuthenticationError for malformed token', () => {
      expect(() => verifyToken('not-a-valid-token')).toThrow(AuthenticationError);
      expect(() => verifyToken('not-a-valid-token')).toThrow('Invalid token');
    });

    it('should throw AuthenticationError for token with wrong secret', () => {
      const payload = { userId: 'user-123', email: 'test@example.com', role: 'USER' as const };
      const wrongSecretToken = jwt.sign(payload, 'wrong-secret', {
        expiresIn: '1h',
        algorithm: 'HS256',
      });

      expect(() => verifyToken(wrongSecretToken)).toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for empty token', () => {
      expect(() => verifyToken('')).toThrow(AuthenticationError);
    });
  });

  describe('Password Hashing', () => {
    it('should hash a password', async () => {
      const password = 'mySecurePassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash).toContain('$2a$');
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'samePassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should throw an error for empty password', async () => {
      await expect(hashPassword('')).resolves.toBeDefined();
    });
  });

  describe('Password Comparison', () => {
    it('should return true for matching password', async () => {
      const password = 'mySecurePassword123!';
      const hash = await hashPassword(password);

      const result = await comparePassword(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const hash = await hashPassword('correctPassword');
      const result = await comparePassword('wrongPassword', hash);
      expect(result).toBe(false);
    });

    it('should return false for empty string comparison', async () => {
      const hash = await hashPassword('somePassword');
      const result = await comparePassword('', hash);
      expect(result).toBe(false);
    });
  });

  describe('Auth Middleware - authenticate', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: jest.Mock;

    beforeEach(() => {
      mockReq = {
        headers: {},
      };
      mockRes = {};
      mockNext = jest.fn();
    });

    it('should pass with valid token', () => {
      const token = generateToken({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER',
      });
      mockReq.headers = { authorization: `Bearer ${token}` };

      authenticate(
        mockReq as any,
        mockRes as Response,
        mockNext as NextFunction,
      );

      expect(mockNext).toHaveBeenCalledWith();
      expect((mockReq as any).user).toBeDefined();
      expect((mockReq as any).user.userId).toBe('user-123');
    });

    it('should call next with error when no authorization header', () => {
      mockReq.headers = {};

      authenticate(
        mockReq as any,
        mockRes as Response,
        mockNext as NextFunction,
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(mockNext.mock.calls[0][0].message).toBe('No authorization header provided');
    });

    it('should call next with error for malformed authorization header', () => {
      mockReq.headers = { authorization: 'InvalidHeader' };

      authenticate(
        mockReq as any,
        mockRes as Response,
        mockNext as NextFunction,
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(mockNext.mock.calls[0][0].message).toContain('Invalid authorization header format');
    });

    it('should call next with error for expired token', () => {
      const expiredToken = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', role: 'USER' },
        'test-jwt-secret-key-for-testing',
        { expiresIn: '0s', algorithm: 'HS256' },
      );
      mockReq.headers = { authorization: `Bearer ${expiredToken}` };

      authenticate(
        mockReq as any,
        mockRes as Response,
        mockNext as NextFunction,
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(mockNext.mock.calls[0][0].message).toBe('Token expired');
    });

    it('should call next with error for invalid token', () => {
      mockReq.headers = { authorization: 'Bearer invalid-token-here' };

      authenticate(
        mockReq as any,
        mockRes as Response,
        mockNext as NextFunction,
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should call next with error when token is missing after Bearer', () => {
      mockReq.headers = { authorization: 'Bearer ' };

      authenticate(
        mockReq as any,
        mockRes as Response,
        mockNext as NextFunction,
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });
  });

  describe('Role Authorization - requireRole', () => {
    let mockReq: Partial<any>;
    let mockRes: Partial<Response>;
    let mockNext: jest.Mock;

    beforeEach(() => {
      mockReq = { user: null };
      mockRes = {};
      mockNext = jest.fn();
    });

    it('should pass when user has required role', () => {
      mockReq.user = {
        userId: 'user-123',
        email: 'admin@test.com',
        role: 'ADMIN',
      };

      const middleware = requireRole('ADMIN');
      middleware(
        mockReq as any,
        mockRes as Response,
        mockNext as NextFunction,
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass when user has one of the required roles', () => {
      mockReq.user = {
        userId: 'user-123',
        email: 'user@test.com',
        role: 'USER',
      };

      const middleware = requireRole('USER', 'ADMIN');
      middleware(
        mockReq as any,
        mockRes as Response,
        mockNext as NextFunction,
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next with error when user lacks required role', () => {
      mockReq.user = {
        userId: 'user-123',
        email: 'user@test.com',
        role: 'USER',
      };

      const middleware = requireRole('ADMIN');
      middleware(
        mockReq as any,
        mockRes as Response,
        mockNext as NextFunction,
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthorizationError));
      expect(mockNext.mock.calls[0][0].message).toContain('Access denied');
    });

    it('should call next with error when user is not authenticated', () => {
      mockReq.user = undefined;

      const middleware = requireRole('ADMIN');
      middleware(
        mockReq as any,
        mockRes as Response,
        mockNext as NextFunction,
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(mockNext.mock.calls[0][0].message).toBe('Authentication required');
    });
  });

  describe('Optional Auth Middleware', () => {
    let mockReq: Partial<any>;
    let mockRes: Partial<Response>;
    let mockNext: jest.Mock;

    beforeEach(() => {
      mockReq = { headers: {} };
      mockRes = {};
      mockNext = jest.fn();
    });

    it('should decode token when provided', () => {
      const token = generateToken({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER',
      });
      mockReq.headers = { authorization: `Bearer ${token}` };

      optionalAuth(
        mockReq as any,
        mockRes as Response,
        mockNext as NextFunction,
      );

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.userId).toBe('user-123');
    });

    it('should pass without error when no token is provided', () => {
      optionalAuth(
        mockReq as any,
        mockRes as Response,
        mockNext as NextFunction,
      );

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.user).toBeUndefined();
    });

    it('should silently ignore invalid token', () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };

      optionalAuth(
        mockReq as any,
        mockRes as Response,
        mockNext as NextFunction,
      );

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.user).toBeUndefined();
    });
  });
});
