import { ProviderService } from '../../src/services/provider.service';
import { providerRegistry } from '../../src/providers/registry';
import { ProviderError } from '../../src/core/error-handler/index';
import { Provider, GenerateVideoOptions, VideoJobStatus } from '../../src/providers/interface';

jest.mock('../../src/providers/registry', () => ({
  providerRegistry: {
    get: jest.fn(),
    getBest: jest.fn(),
    getAvailable: jest.fn(),
    getMetrics: jest.fn(),
    updateMetrics: jest.fn(),
    getAll: jest.fn(),
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

jest.mock('../../src/core/config/index', () => ({
  config: {
    providers: {},
  },
}));

function createMockProvider(name: string, available = true): jest.Mocked<Provider> {
  return {
    name,
    displayName: name.charAt(0).toUpperCase() + name.slice(1),
    capabilities: ['text-to-video', 'image-to-video'],
    baseUrl: `https://api.${name}.com/v1`,
    isAvailable: available,
    generateVideo: jest.fn(),
    getStatus: jest.fn(),
    cancelJob: jest.fn(),
  };
}

function createMockJobStatus(overrides: Partial<VideoJobStatus> = {}): VideoJobStatus {
  return {
    jobId: 'job-123',
    status: 'completed',
    progress: 100,
    resultUrl: 'https://example.com/video.mp4',
    ...overrides,
  };
}

describe('ProviderService', () => {
  let providerService: ProviderService;
  const mockProvider = createMockProvider('testProvider');

  beforeEach(() => {
    jest.clearAllMocks();
    providerService = new ProviderService(true);

    (mockProvider.generateVideo as jest.Mock).mockResolvedValue(createMockJobStatus());
    (providerRegistry.get as jest.Mock).mockReturnValue(mockProvider);
    (providerRegistry.getBest as jest.Mock).mockReturnValue(mockProvider);
    (providerRegistry.getAvailable as jest.Mock).mockReturnValue([mockProvider]);
    (providerRegistry.getMetrics as jest.Mock).mockReturnValue({
      successRate: 0.95,
      avgLatency: 2500,
      totalJobs: 100,
      lastUsedAt: new Date(),
      isAvailable: true,
    });
  });

  describe('generateVideo', () => {
    it('should generate video with preferred provider', async () => {
      const result = await providerService.generateVideo('test prompt', {
        provider: 'testProvider',
      });

      expect(result).toBeDefined();
      expect(result.jobId).toBe('job-123');
      expect(mockProvider.generateVideo).toHaveBeenCalled();
      expect(providerRegistry.updateMetrics).toHaveBeenCalledWith('testProvider', true, expect.any(Number));
    });

    it('should throw ProviderError when preferred provider not found', async () => {
      (providerRegistry.get as jest.Mock).mockImplementation(() => {
        throw new Error('Provider not found');
      });

      await expect(
        providerService.generateVideo('test prompt', { provider: 'nonexistent' }),
      ).rejects.toThrow(ProviderError);

      await expect(
        providerService.generateVideo('test prompt', { provider: 'nonexistent' }),
      ).rejects.toThrow('Preferred provider "nonexistent" not found');
    });

    it('should throw ProviderError when preferred provider is unavailable', async () => {
      const unavailableProvider = createMockProvider('unavailable', false);
      (providerRegistry.get as jest.Mock).mockReturnValue(unavailableProvider);

      await expect(
        providerService.generateVideo('test prompt', { provider: 'unavailable' }),
      ).rejects.toThrow(ProviderError);

      await expect(
        providerService.generateVideo('test prompt', { provider: 'unavailable' }),
      ).rejects.toThrow('is currently unavailable');
    });

    it('should use best provider when no preferred provider specified', async () => {
      const result = await providerService.generateVideo('test prompt');

      expect(result).toBeDefined();
      expect(providerRegistry.getBest).toHaveBeenCalled();
      expect(mockProvider.generateVideo).toHaveBeenCalled();
    });

    it('should update metrics on success', async () => {
      await providerService.generateVideo('test prompt');

      expect(providerRegistry.updateMetrics).toHaveBeenCalledWith(
        'testProvider',
        true,
        expect.any(Number),
      );
    });

    it('should update metrics and throw on failure', async () => {
      (mockProvider.generateVideo as jest.Mock).mockRejectedValue(new Error('Generation failed'));

      await expect(
        providerService.generateVideo('test prompt'),
      ).rejects.toThrow(ProviderError);

      expect(providerRegistry.updateMetrics).toHaveBeenCalledWith(
        'testProvider',
        false,
        expect.any(Number),
      );
    });
  });

  describe('Fallback', () => {
    it('should try fallback providers in order of success rate', async () => {
      const provider1 = createMockProvider('bestProvider');
      const provider2 = createMockProvider('fallbackProvider');
      const provider3 = createMockProvider('lastProvider');

      (provider1.generateVideo as jest.Mock).mockRejectedValue(new Error('Failed'));
      (provider2.generateVideo as jest.Mock).mockResolvedValue(createMockJobStatus({ jobId: 'from-fallback' }));

      (providerRegistry.getAvailable as jest.Mock).mockReturnValue([provider1, provider2, provider3]);
      (providerRegistry.getMetrics as jest.Mock).mockImplementation((name: string) => {
        const metrics: Record<string, any> = {
          bestProvider: { successRate: 0.99, avgLatency: 1000, totalJobs: 500, lastUsedAt: new Date(), isAvailable: true },
          fallbackProvider: { successRate: 0.85, avgLatency: 3000, totalJobs: 200, lastUsedAt: new Date(), isAvailable: true },
          lastProvider: { successRate: 0.5, avgLatency: 5000, totalJobs: 50, lastUsedAt: new Date(), isAvailable: true },
        };
        return metrics[name];
      });

      const result = await providerService.generateVideo('fallback test');

      expect(result.jobId).toBe('from-fallback');
      expect(provider2.generateVideo).toHaveBeenCalled();
    });

    it('should throw error when all providers fail', async () => {
      const provider1 = createMockProvider('provider1');
      const provider2 = createMockProvider('provider2');

      (provider1.generateVideo as jest.Mock).mockRejectedValue(new Error('API error'));
      (provider2.generateVideo as jest.Mock).mockRejectedValue(new Error('Rate limited'));

      (providerRegistry.getAvailable as jest.Mock).mockReturnValue([provider1, provider2]);
      (providerRegistry.getMetrics as jest.Mock).mockReturnValue({
        successRate: 0.5, avgLatency: 5000, totalJobs: 50, lastUsedAt: new Date(), isAvailable: true,
      });

      await expect(
        providerService.generateVideo('test'),
      ).rejects.toThrow('All providers failed');
    });

    it('should throw when no providers available', async () => {
      (providerRegistry.getAvailable as jest.Mock).mockReturnValue([]);

      await expect(
        providerService.generateVideo('test'),
      ).rejects.toThrow('No video generation providers are currently available');
    });

    it('should not use fallback when fallback disabled', async () => {
      providerService = new ProviderService(false);

      await providerService.generateVideo('test prompt');

      expect(providerRegistry.getBest).toHaveBeenCalled();
      expect(providerRegistry.getAvailable).not.toHaveBeenCalled();
    });
  });

  describe('getJobStatus', () => {
    it('should return job status from provider', async () => {
      const status = createMockJobStatus({ jobId: 'job-456', status: 'processing', progress: 50 });
      (mockProvider.getStatus as jest.Mock).mockResolvedValue(status);

      const result = await providerService.getJobStatus('testProvider', 'job-456');

      expect(result).toEqual(status);
      expect(providerRegistry.get).toHaveBeenCalledWith('testProvider');
    });

    it('should forward provider errors', async () => {
      (mockProvider.getStatus as jest.Mock).mockRejectedValue(new Error('Job not found'));

      await expect(
        providerService.getJobStatus('testProvider', 'invalid-job'),
      ).rejects.toThrow('Job not found');
    });
  });

  describe('cancelJob', () => {
    it('should cancel job on provider', async () => {
      (mockProvider.cancelJob as jest.Mock).mockResolvedValue(true);

      const result = await providerService.cancelJob('testProvider', 'job-123');

      expect(result).toBe(true);
      expect(providerRegistry.get).toHaveBeenCalledWith('testProvider');
    });

    it('should return false when cancellation fails', async () => {
      (mockProvider.cancelJob as jest.Mock).mockResolvedValue(false);

      const result = await providerService.cancelJob('testProvider', 'job-123');

      expect(result).toBe(false);
    });
  });

  describe('getBestProvider', () => {
    it('should return best provider from registry', () => {
      const result = providerService.getBestProvider();

      expect(result).toBe(mockProvider);
      expect(providerRegistry.getBest).toHaveBeenCalled();
    });
  });

  describe('estimateCost', () => {
    it('should calculate base cost correctly', () => {
      const cost = providerService.estimateCost('testProvider', { duration: 5, resolution: '720p' });
      expect(cost).toBeGreaterThan(0);
    });

    it('should increase cost for higher resolution', () => {
      const cost720p = providerService.estimateCost('testProvider', { duration: 5, resolution: '720p' });
      const cost1080p = providerService.estimateCost('testProvider', { duration: 5, resolution: '1080p' });
      const cost4k = providerService.estimateCost('testProvider', { duration: 5, resolution: '4k' });

      expect(cost1080p).toBeGreaterThan(cost720p);
      expect(cost4k).toBeGreaterThan(cost1080p);
    });

    it('should increase cost for longer duration', () => {
      const cost5s = providerService.estimateCost('testProvider', { duration: 5 });
      const cost30s = providerService.estimateCost('testProvider', { duration: 30 });

      expect(cost30s).toBeGreaterThan(cost5s);
    });

    it('should add style multiplier', () => {
      const costNoStyle = providerService.estimateCost('testProvider', { duration: 5 });
      const costWithStyle = providerService.estimateCost('testProvider', { duration: 5, style: 'cinematic' });

      expect(costWithStyle).toBeGreaterThan(costNoStyle);
    });

    it('should add image multiplier when imageUrl provided', () => {
      const costNoImage = providerService.estimateCost('testProvider', { duration: 5 });
      const costWithImage = providerService.estimateCost('testProvider', { duration: 5, imageUrl: 'http://example.com/img.jpg' });

      expect(costWithImage).toBeGreaterThan(costNoImage);
    });

    it('should add video reference multiplier', () => {
      const costNoRef = providerService.estimateCost('testProvider', { duration: 5 });
      const costWithRef = providerService.estimateCost('testProvider', { duration: 5, videoRefUrl: 'http://example.com/ref.mp4' });

      expect(costWithRef).toBeGreaterThan(costNoRef);
    });

    it('should handle unknown provider with default rate', () => {
      const cost = providerService.estimateCost('unknownProvider', { duration: 5 });
      expect(cost).toBeGreaterThan(0);
    });
  });
});
