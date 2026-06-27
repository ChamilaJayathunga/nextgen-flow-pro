import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function main(): Promise<void> {
  console.log('Seeding NextGen Flow Pro database...\n');

  const adminPassword = await hashPassword('password123');
  const userPassword = await hashPassword('password123');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@nextgenflow.com' },
    update: {},
    create: {
      id: uuidv4(),
      name: 'Admin User',
      email: 'admin@nextgenflow.com',
      password: adminPassword,
      role: 'ADMIN',
      plan: 'ENTERPRISE',
      credits: 50000,
      emailVerified: true,
    },
  });
  console.log(`Admin user created: ${admin.email}`);

  const regularUser = await prisma.user.upsert({
    where: { email: 'user@nextgenflow.com' },
    update: {},
    create: {
      id: uuidv4(),
      name: 'Demo User',
      email: 'user@nextgenflow.com',
      password: userPassword,
      role: 'USER',
      plan: 'PRO',
      credits: 2500,
      emailVerified: true,
    },
  });
  console.log(`Regular user created: ${regularUser.email}`);

  const promptTemplates = [
    {
      title: 'Epic Cinematic Landscape',
      content: 'A sweeping cinematic aerial shot of {location} at {time_of_day}, with dramatic lighting, volumetric clouds, and a sense of epic scale. Shot on Arri Alexa LF with anamorphic lenses, 24fps, shallow depth of field, cinematic color grading with warm highlights and cool shadows.',
      category: 'Cinematic',
      userId: admin.id,
      isPublic: true,
    },
    {
      title: 'Nature Documentary',
      content: 'A stunning nature documentary shot of {animal/subject} in {environment}, captured in pristine 4K resolution with natural lighting. National Geographic style, slow graceful movements, shallow depth of field, rich natural colors.',
      category: 'Nature',
      userId: admin.id,
      isPublic: true,
    },
    {
      title: 'Cyberpunk Cityscape',
      content: 'A sprawling cyberpunk cityscape at night in {city_name}, featuring towering neon-lit skyscrapers, flying vehicles, holographic advertisements, rain-slicked streets. Blade Runner aesthetic, teal and pink color palette, volumetric fog, cinematic lighting.',
      category: 'Sci-Fi',
      userId: admin.id,
      isPublic: true,
    },
    {
      title: 'Fantasy Realm Exploration',
      content: 'A magical fantasy landscape featuring {fantasy_element} in an enchanted {environment}. Ethereal lighting filtering through ancient trees, floating mystical particles, glowing flora, majestic mythical creatures. Epic fantasy art style, rich saturated colors.',
      category: 'Fantasy',
      userId: admin.id,
      isPublic: true,
    },
    {
      title: 'Product Showcase - Luxury',
      content: 'A premium product showcase of {product_name} rotating gracefully on a minimalist pedestal. Smooth 360-degree orbit, soft studio lighting with subtle rim lights, shallow depth of field with bokeh background.',
      category: 'Product',
      userId: admin.id,
      isPublic: true,
    },
    {
      title: 'Music Video - Energetic',
      content: 'A high-energy music video sequence featuring {artist/subject} performing against a dynamic {background_style}. Fast-paced editing, vibrant color grading, creative transitions, stylized lighting effects, crowd energy.',
      category: 'Music Video',
      userId: admin.id,
      isPublic: true,
    },
    {
      title: 'Dreamy Animation',
      content: 'A whimsical 2D animation sequence set in a {setting} with a dreamy, storybook art style. Hand-drawn aesthetic with fluid motion, soft pastel colors, gentle transformations, floating elements, magical sparkles.',
      category: 'Animation',
      userId: admin.id,
      isPublic: true,
    },
    {
      title: 'Historical Documentary',
      content: 'A visually compelling historical documentary scene depicting {historical_event} in {time_period}. Authentic period-accurate costumes and sets, warm film grain texture, cinematic lighting, slow deliberate camera movements.',
      category: 'Documentary',
      userId: admin.id,
      isPublic: true,
    },
    {
      title: 'Abstract Visual Art',
      content: 'A mesmerizing abstract visual art piece exploring {theme}. Fluid organic shapes morphing and flowing, vibrant color transitions, particle systems, generative patterns, hypnotic movement.',
      category: 'Abstract',
      userId: admin.id,
      isPublic: true,
    },
    {
      title: 'Commercial Advertisement',
      content: 'A polished 30-second commercial advertisement for {brand}. Professional studio-quality production, tight close-ups of product features, lifestyle shots showing product in use, clear value proposition.',
      category: 'Commercial',
      userId: admin.id,
      isPublic: true,
    },
  ];

  for (const template of promptTemplates) {
    await prisma.promptTemplate.create({
      data: {
        id: uuidv4(),
        ...template,
      },
    });
  }
  console.log(`Created ${promptTemplates.length} prompt templates`);

  const providerData = [
    { provider: 'googleFlow', successCount: 1420, failCount: 58, avgLatency: 3200, totalJobs: 1478 },
    { provider: 'openai', successCount: 3820, failCount: 120, avgLatency: 4500, totalJobs: 3940 },
    { provider: 'runway', successCount: 2100, failCount: 95, avgLatency: 2800, totalJobs: 2195 },
    { provider: 'pika', successCount: 3400, failCount: 210, avgLatency: 3800, totalJobs: 3610 },
    { provider: 'luma', successCount: 890, failCount: 45, avgLatency: 5200, totalJobs: 935 },
    { provider: 'kling', successCount: 4300, failCount: 380, avgLatency: 2500, totalJobs: 4680 },
    { provider: 'pixverse', successCount: 5200, failCount: 420, avgLatency: 1800, totalJobs: 5620 },
    { provider: 'hailuo', successCount: 1650, failCount: 130, avgLatency: 3500, totalJobs: 1780 },
    { provider: 'stability', successCount: 2700, failCount: 180, avgLatency: 4200, totalJobs: 2880 },
    { provider: 'replicate', successCount: 3900, failCount: 290, avgLatency: 5600, totalJobs: 4190 },
    { provider: 'fal', successCount: 4800, failCount: 350, avgLatency: 2100, totalJobs: 5150 },
  ];

  for (const pd of providerData) {
    await prisma.providerUsage.create({
      data: {
        ...pd,
        lastUsedAt: new Date(),
      },
    });
  }
  console.log(`Created ${providerData.length} provider usage records`);

  const jobTemplates = [
    {
      prompt: 'A majestic bald eagle soaring over misty mountain peaks at golden hour',
      provider: 'pixverse',
      status: 'COMPLETED',
      resultUrl: 'https://storage.nextgenflowpro.com/videos/eagle-soaring-001.mp4',
      thumbnailUrl: 'https://storage.nextgenflowpro.com/thumbnails/eagle-soaring-001.jpg',
      progress: 100,
      duration: 8.5,
      cost: 0.45,
    },
    {
      prompt: 'Neon-lit Tokyo street at night with rain reflections, cyberpunk aesthetic',
      provider: 'kling',
      status: 'COMPLETED',
      resultUrl: 'https://storage.nextgenflowpro.com/videos/neon-tokyo-002.mp4',
      thumbnailUrl: 'https://storage.nextgenflowpro.com/thumbnails/neon-tokyo-002.jpg',
      progress: 100,
      duration: 12.0,
      cost: 0.72,
    },
    {
      prompt: 'Underwater coral reef teeming with colorful tropical fish, sunlight rays piercing through',
      provider: 'fal',
      status: 'COMPLETED',
      resultUrl: 'https://storage.nextgenflowpro.com/videos/coral-reef-003.mp4',
      thumbnailUrl: 'https://storage.nextgenflowpro.com/thumbnails/coral-reef-003.jpg',
      progress: 100,
      duration: 15.0,
      cost: 0.90,
    },
    {
      prompt: 'Cinematic tracking shot of a sports car driving along a scenic coastal highway',
      provider: 'runway',
      status: 'COMPLETED',
      resultUrl: 'https://storage.nextgenflowpro.com/videos/sports-car-004.mp4',
      thumbnailUrl: 'https://storage.nextgenflowpro.com/thumbnails/sports-car-004.jpg',
      progress: 100,
      duration: 10.0,
      cost: 0.60,
    },
    {
      prompt: 'Enchanted forest with glowing mushrooms and magical fireflies at twilight',
      provider: 'stability',
      status: 'COMPLETED',
      resultUrl: 'https://storage.nextgenflowpro.com/videos/enchanted-forest-005.mp4',
      thumbnailUrl: 'https://storage.nextgenflowpro.com/thumbnails/enchanted-forest-005.jpg',
      progress: 100,
      duration: 6.0,
      cost: 0.36,
    },
    {
      prompt: 'Time-lapse of a futuristic city being built, construction drones flying everywhere',
      provider: 'pika',
      status: 'PROCESSING',
      progress: 65,
    },
    {
      prompt: 'Abstract fluid art simulation with vibrant neon colors and organic shapes',
      provider: 'googleFlow',
      status: 'PROCESSING',
      progress: 32,
    },
    {
      prompt: 'A dragon soaring through storm clouds with lightning strikes in the background',
      provider: 'luma',
      status: 'FAILED',
      errorMessage: 'Provider rate limit exceeded. Please try again later.',
      progress: 15,
    },
    {
      prompt: 'Professional product showcase of a luxury smartwatch with rotating display',
      provider: 'replicate',
      status: 'FAILED',
      errorMessage: 'Invalid video generation parameters: duration exceeds maximum allowed.',
      progress: 0,
    },
    {
      prompt: 'Aerial drone footage of a vineyard during harvest season, golden hour lighting',
      provider: 'hailuo',
      status: 'PENDING',
      progress: 0,
    },
    {
      prompt: 'Anime-style scene of a samurai standing on a cliff overlooking a sunset',
      provider: 'openai',
      status: 'PENDING',
      progress: 0,
    },
    {
      prompt: 'Deep space nebula with swirling cosmic dust and distant galaxies',
      provider: 'pixverse',
      status: 'COMPLETED',
      resultUrl: 'https://storage.nextgenflowpro.com/videos/space-nebula-012.mp4',
      thumbnailUrl: 'https://storage.nextgenflowpro.com/thumbnails/space-nebula-012.jpg',
      progress: 100,
      duration: 20.0,
      cost: 1.20,
    },
    {
      prompt: 'A bustling medieval market square with merchants and townspeople',
      provider: 'fal',
      status: 'CANCELLED',
      progress: 0,
    },
    {
      prompt: 'Close-up macro footage of a blooming flower, time-lapse style',
      provider: 'kling',
      status: 'COMPLETED',
      resultUrl: 'https://storage.nextgenflowpro.com/videos/flower-bloom-014.mp4',
      thumbnailUrl: 'https://storage.nextgenflowpro.com/thumbnails/flower-bloom-014.jpg',
      progress: 100,
      duration: 5.0,
      cost: 0.30,
    },
    {
      prompt: 'A dramatic thunderstorm rolling over a prairie at dusk with lightning flashes',
      provider: 'pika',
      status: 'PROCESSING',
      progress: 88,
    },
  ];

  const createdJobs: { id: string; userId: string }[] = [];
  for (const jobData of jobTemplates) {
    const job = await prisma.videoJob.create({
      data: {
        id: uuidv4(),
        userId: regularUser.id,
        ...jobData,
      },
      select: { id: true, userId: true },
    });
    createdJobs.push(job);
  }
  console.log(`Created ${createdJobs.length} video jobs`);

  const favoriteIds = [createdJobs[0].id, createdJobs[2].id, createdJobs[4].id, createdJobs[11].id];
  for (const jobId of favoriteIds) {
    await prisma.userFavorite.create({
      data: {
        userId: regularUser.id,
        videoJobId: jobId,
      },
    });
  }
  console.log(`Created ${favoriteIds.length} favorites`);

  console.log('\nSeed Summary:');
  console.log('   - Users: 2 (1 admin, 1 regular)');
  console.log('   - Prompt Templates:', promptTemplates.length);
  console.log('   - Provider Usage Records:', providerData.length);
  console.log('   - Video Jobs:', createdJobs.length);
  console.log('   - Favorites:', favoriteIds.length);
  console.log('\nSeeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
