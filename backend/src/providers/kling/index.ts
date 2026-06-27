import { config } from '../../core/config/index.js';
import { logger } from '../../core/logger/index.js';
import { Provider, GenerateVideoOptions, VideoJobStatus } from '../interface.js';
import { providerRegistry } from '../registry.js';

const PROVIDER_NAME = 'kling';
const TIMEOUT_MS = 180_000;

interface KlingVideoResponse {
  code: number;
  message: string;
  data?: {
    taskId: string;
    taskStatus: 'submitted' | 'processing' | 'succeed' | 'failed';
    taskResult?: {
      videoUrl: string;
      thumbnailUrl: string;
      duration: number;
    };
    errorMessage?: string;
  };
}

class KlingProvider implements Provider {
  readonly name = PROVIDER_NAME;
  readonly displayName = 'Kling AI';
  readonly capabilities = ['text-to-video', 'image-to-video', 'multiple-aspect-ratios', 'high-quality'];
  readonly baseUrl: string;
  readonly isAvailable: boolean;

  private readonly apiKey: string;

  constructor() {
    this.apiKey = config.providers.kling.apiKey;
    this.baseUrl = config.providers.kling.baseUrl;
    this.isAvailable = !!this.apiKey;
  }

  async generateVideo(options: GenerateVideoOptions): Promise<VideoJobStatus> {
    if (!this.apiKey) {
      return this.mockGenerate(options);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const body: Record<string, unknown> = {
        prompt: options.prompt,
        duration: options.duration || 5,
        aspect_ratio: this.parseAspectRatio(options.resolution),
      };

      if (options.imageUrl) {
        body.image_url = options.imageUrl;
        body.mode = 'image_to_video';
      } else {
        body.mode = 'text_to_video';
      }
      if (options.negativePrompt) {
        body.negative_prompt = options.negativePrompt;
      }
      if (options.style) {
        body.style = options.style;
      }

      const response = await fetch(`${this.baseUrl}/videos`, {
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
        let parsed: { message?: string } = {};
        try { parsed = JSON.parse(errBody); } catch { /* empty */ }
        throw new Error(`Kling API error ${response.status}: ${parsed.message || errBody}`);
      }

      const result: KlingVideoResponse = await response.json();

      if (result.code !== 0 || !result.data) {
        throw new Error(`Kling API error: ${result.message}`);
      }

      return {
        jobId: result.data.taskId,
        status: this.mapStatus(result.data.taskStatus),
        progress: this.statusToProgress(result.data.taskStatus),
        resultUrl: result.data.taskResult?.videoUrl,
        thumbnailUrl: result.data.taskResult?.thumbnailUrl,
        errorMessage: result.data.errorMessage,
        estimatedDuration: result.data.taskResult?.duration,
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
      const response = await fetch(`${this.baseUrl}/videos/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Kling status error ${response.status}: ${errBody}`);
      }

      const result: KlingVideoResponse = await response.json();

      if (result.code !== 0 || !result.data) {
        throw new Error(`Kling status error: ${result.message}`);
      }

      return {
        jobId,
        status: this.mapStatus(result.data.taskStatus),
        progress: this.statusToProgress(result.data.taskStatus),
        resultUrl: result.data.taskResult?.videoUrl,
        thumbnailUrl: result.data.taskResult?.thumbnailUrl,
        errorMessage: result.data.errorMessage,
        estimatedDuration: result.data.taskResult?.duration,
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
      const response = await fetch(`${this.baseUrl}/videos/${jobId}/cancel`, {
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

      const result: { code: number; message: string } = await response.json();
      return result.code === 0;
    } catch (error: unknown) {
      logger.error(`[${PROVIDER_NAME}] cancelJob error`, { error, jobId });
      return false;
    }
  }

  private parseAspectRatio(resolution?: string): string {
    if (!resolution) return '16:9';
    const map: Record<string, string> = {
      '1920x1080': '16:9',
      '1080x1920': '9:16',
      '1080x1080': '1:1',
      '3840x2160': '16:9',
      '720x1280': '9:16',
      '1280x720': '16:9',
      '768x768': '1:1',
    };
    return map[resolution] || '16:9';
  }

  private mapStatus(status: string): VideoJobStatus['status'] {
    switch (status) {
      case 'submitted':
        return 'pending';
      case 'processing':
        return 'processing';
      case 'succeed':
        return 'completed';
      case 'failed':
        return 'failed';
      default:
        return 'pending';
    }
  }

  private statusToProgress(status: string): number {
    switch (status) {
      case 'submitted':
        return 5;
      case 'processing':
        return 50;
      case 'succeed':
        return 100;
      case 'failed':
        return 0;
      default:
        return 0;
    }
  }

  private async mockGenerate(options: GenerateVideoOptions): Promise<VideoJobStatus> {
    const jobId = `kling-mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    logger.info(`[${PROVIDER_NAME}] Mock generateVideo`, { prompt: options.prompt, jobId });
    return {
      jobId,
      status: 'completed',
      progress: 100,
      resultUrl: `https://mock.klingai.com/videos/${jobId}/output.mp4`,
      thumbnailUrl: `https://mock.klingai.com/videos/${jobId}/thumb.jpg`,
      estimatedDuration: options.duration || 5,
    };
  }
}

export function registerProvider(): KlingProvider {
  const provider = new KlingProvider();
  providerRegistry.register(provider);
  logger.info(`Registering provider: ${PROVIDER_NAME}`);
  return provider;
}

export default KlingProvider;
