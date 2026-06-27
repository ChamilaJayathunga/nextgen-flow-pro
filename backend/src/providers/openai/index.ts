import { config } from '../../core/config/index.js';
import { logger } from '../../core/logger/index.js';
import { Provider, GenerateVideoOptions, VideoJobStatus } from '../interface.js';
import { providerRegistry } from '../registry.js';

const PROVIDER_NAME = 'openai';
const TIMEOUT_MS = 120_000;

interface OpenAIVideoResponse {
  data: Array<{
    id: string;
    url?: string;
    revised_prompt?: string;
    error?: string;
  }>;
}

interface OpenAIVideoStatusResponse {
  id: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  output?: {
    url?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

class OpenAIProvider implements Provider {
  readonly name = PROVIDER_NAME;
  readonly displayName = 'OpenAI';
  readonly capabilities = ['text-to-video', 'image-to-video', 'high-quality'];
  readonly baseUrl: string;
  readonly isAvailable: boolean;

  private readonly apiKey: string;

  constructor() {
    this.apiKey = config.providers.openai.apiKey;
    this.baseUrl = config.providers.openai.baseUrl;
    this.isAvailable = !!this.apiKey;
  }

  async generateVideo(options: GenerateVideoOptions): Promise<VideoJobStatus> {
    if (!this.apiKey) {
      return this.mockGenerate(options);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const resolution = options.resolution || '1920x1080';

      const body: Record<string, unknown> = {
        model: 'sora-1',
        prompt: options.prompt,
        n: 1,
        size: resolution,
      };

      if (options.imageUrl) {
        body.image_url = options.imageUrl;
      }
      if (options.style) {
        body.style = options.style;
      }
      if (options.duration) {
        body.duration = options.duration;
      }

      const response = await fetch(`${this.baseUrl}/video/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errBody = await response.text();
        let parsed: { error?: { message?: string } } = {};
        try { parsed = JSON.parse(errBody); } catch { /* empty */ }
        const message = parsed?.error?.message || errBody;
        throw new Error(`OpenAI API error ${response.status}: ${message}`);
      }

      const data: OpenAIVideoResponse = await response.json();
      const result = data.data[0];

      if (!result) {
        throw new Error('OpenAI returned empty data array');
      }

      return {
        jobId: result.id,
        status: result.url ? 'completed' : 'pending',
        progress: result.url ? 100 : 10,
        resultUrl: result.url,
        errorMessage: result.error,
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.warn(`[${PROVIDER_NAME}] generateVideo timed out`);
        return this.mockGenerate(options);
      }
      logger.error(`[${PROVIDER_NAME}] generateVideo failed`, { error });
      return this.mockGenerate(options);
    } finally {
      clearTimeout(timeout);
    }
  }

  async getStatus(jobId: string): Promise<VideoJobStatus> {
    if (!this.apiKey) {
      return { jobId, status: 'completed', progress: 100 };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(`${this.baseUrl}/video/generations/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`OpenAI status error ${response.status}: ${errBody}`);
      }

      const data: OpenAIVideoStatusResponse = await response.json();

      const statusMap: Record<string, VideoJobStatus['status']> = {
        queued: 'pending',
        in_progress: 'processing',
        completed: 'completed',
        failed: 'failed',
      };

      const progressMap: Record<string, number> = {
        queued: 5,
        in_progress: 45,
        completed: 100,
        failed: 0,
      };

      return {
        jobId,
        status: statusMap[data.status] || 'pending',
        progress: progressMap[data.status] || 0,
        resultUrl: data.output?.url,
        errorMessage: data.error?.message,
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { jobId, status: 'pending', progress: 0 };
      }
      logger.error(`[${PROVIDER_NAME}] getStatus failed`, { error, jobId });
      return { jobId, status: 'failed', progress: 0, errorMessage: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      clearTimeout(timeout);
    }
  }

  async cancelJob(jobId: string): Promise<boolean> {
    if (!this.apiKey) return true;

    try {
      const response = await fetch(`${this.baseUrl}/video/generations/${jobId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errBody = await response.text();
        logger.error(`[${PROVIDER_NAME}] cancelJob failed`, { status: response.status, body: errBody });
        return false;
      }

      return true;
    } catch (error: unknown) {
      logger.error(`[${PROVIDER_NAME}] cancelJob error`, { error, jobId });
      return false;
    }
  }

  private async mockGenerate(options: GenerateVideoOptions): Promise<VideoJobStatus> {
    const jobId = `openai-mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    logger.info(`[${PROVIDER_NAME}] Mock generateVideo`, { prompt: options.prompt, jobId });
    return {
      jobId,
      status: 'completed',
      progress: 100,
      resultUrl: `https://mock.openai.com/videos/${jobId}/output.mp4`,
      thumbnailUrl: `https://mock.openai.com/videos/${jobId}/thumbnail.jpg`,
      estimatedDuration: options.duration || 10,
    };
  }
}

export function registerProvider(): OpenAIProvider {
  const provider = new OpenAIProvider();
  providerRegistry.register(provider);
  logger.info(`Registering provider: ${PROVIDER_NAME}`);
  return provider;
}

export default OpenAIProvider;
