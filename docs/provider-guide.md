# Provider Plugin Guide

This guide explains how to add a new AI video generation provider to NextGen Flow Pro.

---

## Overview

Providers are modular plugins that implement a common interface. The system uses a Registry pattern to manage all registered providers. Adding a new provider requires:

1. Creating a provider class implementing the `Provider` interface
2. Registering the provider in the server startup
3. Adding configuration to the environment variables
4. Testing the provider

---

## Step-by-Step Guide

### Step 1: Create Provider Directory

Create a new directory under `src/providers/`:

```bash
mkdir -p src/providers/your-provider
```

### Step 2: Create Provider Class

Create `src/providers/your-provider/index.ts` using the template below.

### Step 3: Implement the Provider Interface

All providers must implement the `Provider` interface from `src/providers/interface.ts`.

### Step 4: Register the Provider

Add the provider to the registration list in `src/server.ts`:

```typescript
const providerModules = [
  // ... existing providers
  { name: 'yourProvider', path: './providers/your-provider/index.js' },
];
```

### Step 5: Add Configuration

Add your provider's API key and base URL to:

1. `src/core/config/index.ts` - Default configuration
2. `.env.example` - Environment variable template
3. `.env` - Your local environment file

### Step 6: Test the Provider

Run the test suite and verify the provider works end-to-end.

---

## Template File

Copy the following template to `src/providers/your-provider/index.ts`:

```typescript
import {
  Provider,
  GenerateVideoOptions,
  VideoJobStatus,
} from '../interface.js';
import { config } from '../../core/config/index.js';
import { logger } from '../../core/logger/index.js';
import { ProviderError } from '../../core/error-handler/index.js';

interface YourProviderConfig {
  apiKey: string;
  baseUrl: string;
}

export default class YourProvider implements Provider {
  readonly name = 'yourProvider';
  readonly displayName = 'Your Provider';
  readonly capabilities = ['text-to-video', 'image-to-video'];
  readonly baseUrl: string;
  readonly isAvailable: boolean;

  private apiKey: string;
  private initialized = false;

  constructor(config: Record<string, string>) {
    this.apiKey = config.apiKey || '';
    this.baseUrl = config.baseUrl || 'https://api.your-provider.com/v1';
    this.isAvailable = this.apiKey.length > 0;

    if (!this.apiKey) {
      logger.warn(`YourProvider: No API key configured, provider will be unavailable`);
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    if (!this.apiKey) {
      throw new ProviderError(
        'YourProvider is not configured: missing API key',
        this.name,
      );
    }

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      this.initialized = true;
      logger.info(`YourProvider initialized successfully`);
    } catch (error) {
      logger.error(`YourProvider initialization failed`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new ProviderError(
        `YourProvider initialization failed: ${error instanceof Error ? error.message : String(error)}`,
        this.name,
      );
    }
  }

  async generateVideo(options: GenerateVideoOptions): Promise<VideoJobStatus> {
    await this.ensureInitialized();

    logger.info(`YourProvider: Generating video`, {
      prompt: options.prompt.substring(0, 100),
      duration: options.duration,
      resolution: options.resolution,
    });

    try {
      const requestBody: Record<string, unknown> = {
        prompt: options.prompt,
        duration: options.duration ?? 5,
        resolution: options.resolution ?? '720p',
      };

      if (options.imageUrl) requestBody.image_url = options.imageUrl;
      if (options.style) requestBody.style = options.style;
      if (options.negativePrompt) requestBody.negative_prompt = options.negativePrompt;

      const response = await fetch(`${this.baseUrl}/generations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API error ${response.status}: ${errorBody}`);
      }

      const data = await response.json();

      return {
        jobId: data.id,
        status: 'processing',
        progress: 0,
        estimatedDuration: options.duration ?? 5,
      };
    } catch (error) {
      logger.error(`YourProvider: Generation failed`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new ProviderError(
        `YourProvider generation failed: ${error instanceof Error ? error.message : String(error)}`,
        this.name,
      );
    }
  }

  async getStatus(jobId: string): Promise<VideoJobStatus> {
    await this.ensureInitialized();

    try {
      const response = await fetch(`${this.baseUrl}/generations/${jobId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      const data = await response.json();

      return {
        jobId: data.id,
        status: this.mapStatus(data.status),
        progress: data.progress ?? 0,
        resultUrl: data.result_url,
        thumbnailUrl: data.thumbnail_url,
        errorMessage: data.error,
        estimatedDuration: data.estimated_duration,
        cost: data.cost,
      };
    } catch (error) {
      throw new ProviderError(
        `YourProvider status check failed: ${error instanceof Error ? error.message : String(error)}`,
        this.name,
      );
    }
  }

  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/generations/${jobId}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      return response.ok;
    } catch (error) {
      logger.warn(`YourProvider: Cancel failed`, {
        jobId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  private mapStatus(apiStatus: string): 'pending' | 'processing' | 'completed' | 'failed' {
    const statusMap: Record<string, 'pending' | 'processing' | 'completed' | 'failed'> = {
      queued: 'pending',
      processing: 'processing',
      generating: 'processing',
      completed: 'completed',
      done: 'completed',
      failed: 'failed',
      error: 'failed',
      cancelled: 'failed',
    };
    return statusMap[apiStatus.toLowerCase()] ?? 'pending';
  }
}
```

### Update Registry Metrics

The provider doesn't need to handle metrics directly; the `ProviderService` automatically updates metrics via `providerRegistry.updateMetrics()` after each successful or failed generation.

---

## Adding Cost Configuration

Add your provider's base rate in `src/services/provider.service.ts`:

```typescript
private getBaseRate(providerName: string): number {
  const rates: Record<string, number> = {
    // ... existing rates
    yourProvider: 0.05,  // $0.05 base cost
  };
  return rates[providerName] ?? 0.05;
}
```

Also update `src/services/billing.service.ts` with the same rate if used for billing estimates.

---

## Adding to Pricing Plans

Update the pricing plans in `src/services/billing.service.ts`:

```typescript
// Add your provider to the provider arrays for each plan
providers: ['googleFlow', 'openai', 'runway', /* ... */, 'yourProvider'],
```

---

## Testing Your Provider

### Unit Test

Create `src/tests/providers/your-provider.test.ts`:

```typescript
import YourProvider from '../../src/providers/your-provider/index';

describe('YourProvider', () => {
  it('should initialize with config', () => {
    const provider = new YourProvider({ apiKey: 'test-key', baseUrl: 'https://test.api.com' });
    expect(provider.name).toBe('yourProvider');
    expect(provider.isAvailable).toBe(true);
  });

  it('should be unavailable without API key', () => {
    const provider = new YourProvider({ apiKey: '', baseUrl: 'https://test.api.com' });
    expect(provider.isAvailable).toBe(false);
  });

  it('should have required capabilities', () => {
    const provider = new YourProvider({ apiKey: 'test-key' });
    expect(provider.capabilities).toContain('text-to-video');
  });
});
```

### Integration Test

Test the full flow:

```typescript
import supertest from 'supertest';
import app from '../../src/app';

describe('Provider Integration', () => {
  it('should appear in provider list', async () => {
    const token = getTestToken();
    const response = await supertest(app)
      .get('/api/providers')
      .set('Authorization', `Bearer ${token}`);

    expect(response.body.data.providers.some(
      (p: any) => p.name === 'yourProvider'
    )).toBe(true);
  });
});
```

---

## Best Practices

1. **Error Handling:** Always wrap API calls in try/catch blocks and throw `ProviderError` with meaningful messages. Include the provider name so the system can route errors correctly.

2. **Logging:** Use the structured logger for all provider operations. Include provider name, job ID, and latency for debugging.

3. **Idempotency:** Provider operations should be idempotent where possible. If a job is cancelled, calling cancel again should not error.

4. **Rate Limiting:** Implement client-side rate limiting in your provider if the upstream API has strict limits. Check for `429 Too Many Requests` responses and handle appropriately.

5. **Status Mapping:** Create a clear mapping between the provider's API status values and the system's standard statuses: `pending`, `processing`, `completed`, `failed`.

6. **Configuration:** Use the config system's `optionalEnv` for API keys so the system degrades gracefully when keys are not set.

7. **Testing:** Mock HTTP responses in unit tests. Create integration tests that verify the provider works with the routing and service layers.

8. **Documentation:** Document any provider-specific limitations or quirks in the provider's directory as a README.

---

## Provider Interface Reference

```typescript
interface Provider {
  readonly name: string;           // Unique identifier (kebab-case)
  readonly displayName: string;    // Human-readable name
  readonly capabilities: string[]; // e.g., ['text-to-video', 'image-to-video']
  readonly baseUrl: string;        // API base URL
  readonly isAvailable: boolean;   // Whether provider can accept requests

  generateVideo(options: GenerateVideoOptions): Promise<VideoJobStatus>;
  getStatus(jobId: string): Promise<VideoJobStatus>;
  cancelJob(jobId: string): Promise<boolean>;
}
```

```typescript
interface GenerateVideoOptions {
  prompt: string;              // Required: video description
  imageUrl?: string;           // Optional: source image
  videoRefUrl?: string;        // Optional: reference video
  duration?: number;           // Optional: seconds (1-120)
  resolution?: string;         // Optional: '720p' | '1080p' | '4k'
  style?: string;              // Optional: visual style
  negativePrompt?: string;     // Optional: things to avoid
  [key: string]: unknown;      // Provider-specific options
}
```

```typescript
interface VideoJobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;            // 0-100
  resultUrl?: string;          // Generated video URL
  thumbnailUrl?: string;       // Preview thumbnail
  errorMessage?: string;       // Error description if failed
  estimatedDuration?: number;  // Estimated video length
  cost?: number;               // Generation cost
}
```
