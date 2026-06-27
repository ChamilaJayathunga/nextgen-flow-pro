'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  Play,
  ChevronDown,
  Star,
  Check,
  ArrowRight,
  MessageSquare,
  Image,
  Zap,
  Layout,
  Globe,
  Eye,
  Quote,
  Plus,
  Minus,
  Film,
  Users,
  Video,
  Server,
  Shield,
  Clock,
} from 'lucide-react';

const features = [
  {
    icon: MessageSquare,
    title: 'Text to Video',
    description: 'Transform your ideas into stunning videos with AI-powered text-to-video generation.',
    gradient: 'from-purple-500 to-indigo-500',
  },
  {
    icon: Image,
    title: 'Image to Video',
    description: 'Bring static images to life with dynamic motion and cinematic animations.',
    gradient: 'from-indigo-500 to-blue-500',
  },
  {
    icon: Zap,
    title: 'AI Prompt Enhancer',
    description: 'Automatically enhance your prompts for better, more detailed video outputs.',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    icon: Layout,
    title: 'Storyboard Generator',
    description: 'Create professional storyboards from your script with AI assistance.',
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    icon: Globe,
    title: 'Multi-Provider Support',
    description: 'Access 11+ AI video providers through a single unified platform.',
    gradient: 'from-teal-500 to-emerald-500',
  },
  {
    icon: Eye,
    title: 'Real-time Preview',
    description: 'Watch your videos render in real-time with instant preview capabilities.',
    gradient: 'from-cyan-500 to-blue-500',
  },
];

const howItWorks = [
  {
    step: 1,
    title: 'Write Your Prompt',
    description: 'Describe the video you want to create in natural language. Our AI understands complex descriptions.',
  },
  {
    step: 2,
    title: 'Customize & Enhance',
    description: 'Choose style, duration, resolution, and provider. Use AI enhancement for better results.',
  },
  {
    step: 3,
    title: 'Generate & Download',
    description: 'Watch your video generate in real-time and download in 4K quality instantly.',
  },
];

const providerLogos = [
  '🎬', '🔄', '🎨', '📹', '✨', '🔮', '🌀', '🎭', '🔭', '🧊', '💎', '🎯',
];

const providerNames = [
  'Runway', 'Pika Labs', 'Kaiber', 'Stable Video', 'Genmo', 'Morph',
  'Deforum', 'AnimateDiff', 'Zeroscope', 'ModelScope', 'Video LDM', 'More',
];

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for getting started',
    features: ['5 videos per month', '720p resolution', '5s max duration', 'Basic styles', 'Watermark'],
    cta: 'Get Started',
    popular: false,
    gradient: 'from-gray-500 to-gray-600',
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'For content creators',
    features: ['200 videos per month', '4K resolution', '30s max duration', 'All styles', 'No watermark', 'AI Prompt Enhancer', 'Priority support'],
    cta: 'Start Pro',
    popular: true,
    gradient: 'from-purple-500 to-indigo-500',
  },
  {
    name: 'Enterprise',
    price: '$99',
    period: '/month',
    description: 'For teams & businesses',
    features: ['Unlimited videos', '4K resolution', '60s max duration', 'All styles', 'No watermark', 'API access', 'Custom models', 'Dedicated support', 'Team collaboration'],
    cta: 'Contact Sales',
    popular: false,
    gradient: 'from-amber-500 to-orange-500',
  },
];

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Content Creator',
    avatar: 'SC',
    content: 'NextGen Flow Pro has completely transformed my content creation workflow. I can create stunning videos in minutes that used to take hours.',
    rating: 5,
  },
  {
    name: 'Marcus Johnson',
    role: 'Marketing Director',
    avatar: 'MJ',
    content: 'The multi-provider support is a game-changer. We can always find the best model for each project. The quality is outstanding.',
    rating: 5,
  },
  {
    name: 'Elena Rodriguez',
    role: 'Film Student',
    avatar: 'ER',
    content: 'As a film student, this tool helps me visualize scenes instantly. The storyboard generator is incredibly useful for pre-production.',
    rating: 5,
  },
];

const stats = [
  { label: 'Videos Generated', value: '1.2M', icon: Video },
  { label: 'Active Users', value: '85K', icon: Users },
  { label: 'AI Providers', value: '11+', icon: Server },
  { label: 'Avg. Generation', value: '<30s', icon: Clock },
];

const faqs = [
  { question: 'What is NextGen Flow Pro?', answer: 'NextGen Flow Pro is a premium AI video generation platform that allows you to create stunning videos from text prompts, images, and more. We support 11+ AI providers in a single unified interface.' },
  { question: 'How does the pricing work?', answer: 'We offer three tiers: Free (5 videos/month), Pro ($29/month for 200 videos), and Enterprise ($99/month for unlimited videos). All paid plans include 4K resolution and no watermark.' },
  { question: 'Which AI providers do you support?', answer: 'We support 11+ providers including Runway, Pika Labs, Kaiber, Stable Video Diffusion, Genmo, Morph Studio, Deforum, AnimateDiff, Zeroscope, ModelScope, and Video LDM.' },
  { question: 'Can I use my own images?', answer: 'Yes! You can upload images and we\'ll animate them into videos. We also support video-to-video generation for style transfer.' },
  { question: 'Is there a watermark on free plan?', answer: 'Yes, the free plan includes a small watermark. Pro and Enterprise plans have no watermark.' },
  { question: 'What resolutions are supported?', answer: 'We support 720p, 1080p, 2K, and 4K resolutions. The free plan is limited to 720p.' },
];

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { theme } = useTheme();
  const heroRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.8]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[rgb(var(--background))]">
      <Navbar />

      <main>
        {/* HERO */}
        <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
          <div className="absolute inset-0 bg-grid opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-transparent" />
          <motion.div
            className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500/20 rounded-full blur-[128px]"
            animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, -50, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[128px]"
            animate={{ scale: [1, 1.3, 1], x: [0, -50, 0], y: [0, 50, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div style={{ opacity: heroOpacity, scale: heroScale, y: heroY }} className="relative z-10 max-w-5xl mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-6"
            >
              <Badge variant="primary" className="px-4 py-1.5 text-sm mb-6">
                <Sparkles className="w-3.5 h-3.5" /> Powered by 11+ AI Models
              </Badge>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6"
            >
              <span className="gradient-text">Create Stunning</span>
              <br />
              <span className="text-white">AI Videos in Minutes</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-8"
            >
              Transform your ideas into cinematic videos with NextGen Flow Pro.
              The most advanced AI video generation platform powered by 11+ leading providers.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/register">
                <Button variant="gradient" size="xl" className="shadow-neon">
                  <Sparkles className="w-5 h-5" />
                  Start Creating Free
                </Button>
              </Link>
              <Link href="#demo">
                <Button variant="secondary" size="xl">
                  <Play className="w-5 h-5" />
                  Watch Demo
                </Button>
              </Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-12 flex items-center justify-center gap-8 text-sm text-gray-500"
            >
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-400" /> No credit card</span>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-400" /> 5 free videos</span>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-400" /> Cancel anytime</span>
            </motion.div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
              <ChevronDown className="w-6 h-6 text-gray-400" />
            </motion.div>
          </motion.div>
        </section>

        {/* STATS */}
        <section ref={statsRef} className="relative py-20">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass rounded-2xl p-6 text-center"
                >
                  <stat.icon className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="relative py-24">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-transparent" />
          <div className="relative max-w-6xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <Badge variant="primary" className="mb-4">Features</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Everything You Need</h2>
              <p className="text-gray-400 max-w-xl mx-auto">Powerful AI video generation tools at your fingertips</p>
            </motion.div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="glass rounded-2xl p-6 group cursor-default"
                >
                  <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 bg-gradient-to-br', feature.gradient)}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-400">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="relative py-24">
          <div className="max-w-6xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <Badge variant="primary" className="mb-4">How It Works</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Three Simple Steps</h2>
              <p className="text-gray-400 max-w-xl mx-auto">Create professional AI videos in minutes</p>
            </motion.div>
            <div className="grid md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-purple-500/50 via-indigo-500/50 to-teal-500/50" />
              {howItWorks.map((step, i) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 }}
                  className="text-center relative"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white relative z-10 shadow-lg shadow-purple-500/25">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                  <p className="text-gray-400 text-sm">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* PROVIDERS */}
        <section className="relative py-24">
          <div className="max-w-6xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <Badge variant="primary" className="mb-4">Providers</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">11+ AI Providers</h2>
              <p className="text-gray-400 max-w-xl mx-auto">Access the best AI video models through one platform</p>
            </motion.div>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-4">
              {providerLogos.map((logo, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.1, y: -4 }}
                  className="glass rounded-xl p-3 flex flex-col items-center gap-2"
                >
                  <span className="text-2xl">{logo}</span>
                  <span className="text-[10px] text-gray-400 text-center leading-tight">{providerNames[i]}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="relative py-24">
          <div className="absolute inset-0 bg-gradient-to-t from-purple-500/5 via-transparent to-transparent" />
          <div className="relative max-w-6xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <Badge variant="primary" className="mb-4">Pricing</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
              <p className="text-gray-400 max-w-xl mx-auto">Choose the plan that fits your needs</p>
            </motion.div>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {plans.map((plan, i) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -8 }}
                  className={cn(
                    'relative glass rounded-2xl p-8 transition-all',
                    plan.popular && 'border-purple-500/50 shadow-neon'
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-xs font-semibold text-white">
                      Most Popular
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                    <p className="text-sm text-gray-400">{plan.description}</p>
                  </div>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-gray-400 text-sm ml-1">{plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-gray-300">
                        <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href={plan.name === 'Enterprise' ? '#contact' : '/register'}>
                    <Button
                      variant={plan.popular ? 'gradient' : 'secondary'}
                      size="lg"
                      className="w-full"
                    >
                      {plan.cta}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="relative py-24">
          <div className="max-w-6xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <Badge variant="primary" className="mb-4">Testimonials</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Loved by Creators</h2>
              <p className="text-gray-400 max-w-xl mx-auto">See what our users say about NextGen Flow Pro</p>
            </motion.div>
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((t, i) => (
                <motion.div
                  key={t.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass rounded-2xl p-6"
                >
                  <Quote className="w-8 h-8 text-purple-400/50 mb-4" />
                  <p className="text-gray-300 text-sm mb-6 leading-relaxed">{t.content}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-sm font-medium">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.role}</p>
                    </div>
                    <div className="ml-auto flex">
                      {Array.from({ length: t.rating }).map((_, j) => (
                        <Star key={j} className="w-3.5 h-3.5 text-amber-400 fill-current" />
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="relative py-24">
          <div className="max-w-3xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <Badge variant="primary" className="mb-4">FAQ</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Frequently Asked Questions</h2>
            </motion.div>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="glass rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <span className="text-sm font-medium text-white">{faq.question}</span>
                    {openFaq === i ? (
                      <Minus className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    ) : (
                      <Plus className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <p className="px-4 pb-4 text-sm text-gray-400">{faq.answer}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative py-24">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass rounded-3xl p-12 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-indigo-500/10 to-teal-500/10" />
              <div className="relative z-10">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  Ready to Create Amazing Videos?
                </h2>
                <p className="text-gray-400 max-w-lg mx-auto mb-8">
                  Join 85,000+ creators already using NextGen Flow Pro. Start for free, no credit card required.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/register">
                    <Button variant="gradient" size="xl" className="shadow-neon">
                      <Sparkles className="w-5 h-5" />
                      Get Started Free
                    </Button>
                  </Link>
                  <Link href="#features">
                    <Button variant="secondary" size="xl">
                      Learn More
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
