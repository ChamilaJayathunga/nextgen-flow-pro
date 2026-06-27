import { registerProvider as registerGoogleFlow } from './google-flow/index.js';
import { registerProvider as registerOpenAI } from './openai/index.js';
import { registerProvider as registerRunway } from './runway/index.js';
import { registerProvider as registerPika } from './pika/index.js';
import { registerProvider as registerLuma } from './luma/index.js';
import { registerProvider as registerKling } from './kling/index.js';
import { registerProvider as registerPixVerse } from './pixverse/index.js';
import { registerProvider as registerHailuo } from './hailuo/index.js';
import { registerProvider as registerStability } from './stability/index.js';
import { registerProvider as registerReplicate } from './replicate/index.js';
import { registerProvider as registerFal } from './fal/index.js';

import { Provider } from './interface.js';
import type { GenerateVideoOptions, VideoJobStatus, ProviderMetrics } from './interface.js';
import { providerRegistry } from './registry.js';

export type { GenerateVideoOptions, VideoJobStatus, ProviderMetrics };

export { Provider, providerRegistry };

export function registerAllProviders(): Provider[] {
  const providers: Provider[] = [
    registerGoogleFlow(),
    registerOpenAI(),
    registerRunway(),
    registerPika(),
    registerLuma(),
    registerKling(),
    registerPixVerse(),
    registerHailuo(),
    registerStability(),
    registerReplicate(),
    registerFal(),
  ];
  return providers;
}

export { GoogleFlowProvider } from './google-flow/index.js';
export { OpenAIProvider } from './openai/index.js';
export { RunwayProvider } from './runway/index.js';
export { PikaProvider } from './pika/index.js';
export { LumaProvider } from './luma/index.js';
export { KlingProvider } from './kling/index.js';
export { PixVerseProvider } from './pixverse/index.js';
export { HailuoProvider } from './hailuo/index.js';
export { StabilityProvider } from './stability/index.js';
export { ReplicateProvider } from './replicate/index.js';
export { FalProvider } from './fal/index.js';
