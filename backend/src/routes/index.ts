import { Express } from 'express';
import authRoutes from './auth.routes.js';
import videoRoutes from './video.routes.js';
import promptRoutes from './prompt.routes.js';
import providerRoutes from './provider.routes.js';
import adminRoutes from './admin.routes.js';
import analyticsRoutes from './analytics.routes.js';
import billingRoutes from './billing.routes.js';
import favoritesRoutes from './favorites.routes.js';

export function registerRoutes(app: Express): void {
  app.use('/api/auth', authRoutes);
  app.use('/api/video', videoRoutes);
  app.use('/api/prompt', promptRoutes);
  app.use('/api/providers', providerRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/api/favorites', favoritesRoutes);
}
