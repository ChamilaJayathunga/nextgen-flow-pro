# NextGen Flow Pro

> AI-Powered Video Generation SaaS Platform — Turn your ideas into stunning videos with cutting-edge AI.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-20-339933?logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.19-000000?logo=express)](https://expressjs.com/)
[![React](https://img.shields.io/badge/Next.js-14-000000?logo=next.js)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-✓-2496ED?logo=docker)](https://docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Build](https://img.shields.io/badge/Build-Passing-brightgreen)]()
[![Tests](https://img.shields.io/badge/Tests-50+-yellow)]()

---

## Features

| | Feature | Description |
|---|---|---|
| 🎬 | **Multi-Provider AI** | 11 AI video providers (OpenAI, Runway, Pika, Luma, Kling, Pixverse, Hailuo, Stability, Replicate, Fal, Google Flow) |
| 🔄 | **Smart Fallback** | Automatic provider failover with intelligent selection based on success metrics |
| 🚀 | **Queue System** | Redis-backed BullMQ job queue for reliable async processing |
| 📡 | **Real-time Updates** | WebSocket notifications for job progress and completion |
| 🎨 | **Prompt Enhancement** | AI-powered prompt optimization with style, mood, and keyword analysis |
| 📋 | **Storyboard Generator** | Automatic multi-scene storyboard creation from any prompt |
| 💳 | **Credit System** | Tiered billing (Free, Pro, Enterprise) with granular cost control |
| 📊 | **Analytics** | Comprehensive usage stats, provider performance metrics, and trends |
| 🔐 | **JWT Auth** | Secure authentication with role-based access control |
| 🔌 | **Plugin Architecture** | Modular provider system for easy third-party integration |
| 🐳 | **Docker Ready** | Full Docker Compose setup for production deployment |
| 📖 | **OpenAPI Docs** | Interactive Swagger documentation at `/api-docs` |

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/nextgen-flow-pro.git
cd nextgen-flow-pro

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Set up environment
cp backend/.env.example backend/.env

# Start database (Docker required)
docker run -d --name pg -p 5432:5432 \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=nextgen_flow_pro \
  postgres:15

docker run -d --name redis -p 6379:6379 redis:7

# Setup database
cd backend
npx prisma generate
npx prisma migrate dev
npx tsx prisma/seed.ts

# Start development servers
# Terminal 1:
npm run dev

# Terminal 2 (from project root):
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173) for the frontend and [http://localhost:3000/api-docs](http://localhost:3000/api-docs) for API documentation.

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Node.js 20** | Runtime environment |
| **Express.js** | Web framework |
| **TypeScript** | Type safety |
| **Prisma ORM** | Database access |
| **PostgreSQL** | Primary database |
| **Redis** | Queue & cache |
| **BullMQ** | Job queue |
| **Socket.IO** | WebSocket server |
| **JWT** | Authentication |
| **Zod** | Schema validation |
| **Winston** | Logging |
| **Jest** | Testing |
| **Swagger** | API documentation |

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 14** | React framework (App Router) |
| **TypeScript** | Type safety |
| **Tailwind CSS** | Styling |
| **Axios** | HTTP client |
| **Socket.IO Client** | Real-time updates |

### Infrastructure
| Technology | Purpose |
|---|---|
| **Docker** | Containerization |
| **Nginx** | Reverse proxy |
| **Let's Encrypt** | SSL certificates |
| **Prometheus/Grafana** | Monitoring |
| **AWS S3** | File storage |

---

## Screenshots

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   🖼️  Dashboard View                                     │
│   ┌────────────────────────────────────────────────┐    │
│   │  [Screenshot: Dashboard showing job stats,     │    │
│   │   recent videos, credit usage, provider health] │    │
│   └────────────────────────────────────────────────┘    │
│                                                         │
│   🖼️  Video Creation                                    │
│   ┌────────────────────────────────────────────────┐    │
│   │  [Screenshot: Prompt input, provider selection,│    │
│   │   options panel, enhanced prompt preview]      │    │
│   └────────────────────────────────────────────────┘    │
│                                                         │
│   🖼️  Job History                                       │
│   ┌────────────────────────────────────────────────┐    │
│   │  [Screenshot: Paginated job list with status   │    │
│   │   badges, filters, search]                     │    │
│   └────────────────────────────────────────────────┘    │
│                                                         │
│   🖼️  Analytics Dashboard                               │
│   ┌────────────────────────────────────────────────┐    │
│   │  [Screenshot: Charts showing usage trends,    │    │
│   │   provider performance, cost breakdown]        │    │
│   └────────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Architecture Overview

```
Client (Next.js) → API Gateway (Express) → Application Services
                                                │
                    ┌───────────────────────────┼───────────────────┐
                    │                           │                   │
              Queue System                  Provider            Database
              (BullMQ/Redis)              Plugin Layer        (PostgreSQL)
                    │                           │                   │
              Worker Processes          11 Providers           Redis Cache
                    │                      Registry               S3 Storage
                    └───────────────────────────────────────────────┘
```

[Full Architecture Documentation](docs/architecture.md)

---

## Project Structure

```
nextgen-flow-pro/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema
│   │   └── seed.ts                # Demo data seeder
│   ├── src/
│   │   ├── core/
│   │   │   ├── auth/              # JWT & password handling
│   │   │   ├── config/            # Environment configuration
│   │   │   ├── error-handler/     # Error classes & middleware
│   │   │   ├── logger/            # Structured logging
│   │   │   └── queue/             # BullMQ queue service
│   │   ├── middleware/
│   │   │   ├── rateLimiter.ts     # Rate limiting
│   │   │   ├── upload.ts          # File upload handling
│   │   │   └── validate.ts        # Zod schema validation
│   │   ├── providers/
│   │   │   ├── interface.ts       # Provider interface
│   │   │   ├── registry.ts        # Provider registry
│   │   │   ├── google-flow/       # Google Flow provider
│   │   │   ├── openai/            # OpenAI provider
│   │   │   ├── runway/            # RunwayML provider
│   │   │   ├── pika/              # Pika Labs provider
│   │   │   ├── luma/              # Luma AI provider
│   │   │   ├── kling/             # Kling AI provider
│   │   │   ├── pixverse/          # Pixverse provider
│   │   │   ├── hailuo/            # Hailuo AI provider
│   │   │   ├── stability/         # Stability AI provider
│   │   │   ├── replicate/         # Replicate provider
│   │   │   └── fal/               # Fal AI provider
│   │   ├── routes/
│   │   │   ├── index.ts           # Route registration
│   │   │   ├── auth.routes.ts     # Authentication endpoints
│   │   │   ├── video.routes.ts    # Video generation endpoints
│   │   │   ├── prompt.routes.ts   # Prompt enhancement endpoints
│   │   │   ├── provider.routes.ts # Provider info endpoints
│   │   │   ├── admin.routes.ts    # Admin endpoints
│   │   │   ├── analytics.routes.ts# Analytics endpoints
│   │   │   ├── billing.routes.ts  # Billing endpoints
│   │   │   └── favorites.routes.ts# Favorites endpoints
│   │   ├── services/
│   │   │   ├── job.service.ts     # Video job operations
│   │   │   ├── provider.service.ts# Provider selection & fallback
│   │   │   ├── prompt.service.ts  # Prompt enhancement
│   │   │   ├── billing.service.ts # Credits & plans
│   │   │   └── analytics.service.ts# Usage analytics
│   │   ├── websocket/
│   │   │   └── index.ts           # Socket.IO setup
│   │   ├── workers/
│   │   │   ├── index.ts           # Worker registration
│   │   │   └── video.worker.ts    # Video generation worker
│   │   ├── app.ts                 # Express app setup
│   │   ├── server.ts              # Server entry point
│   │   └── swagger.ts             # OpenAPI configuration
│   ├── tests/
│   │   ├── setup.ts               # Test configuration
│   │   ├── core/
│   │   │   ├── auth.test.ts       # Auth unit tests
│   │   │   └── error-handler.test.ts # Error handler tests
│   │   ├── services/
│   │   │   ├── provider.service.test.ts # Provider service tests
│   │   │   └── job.service.test.ts      # Job service tests
│   │   └── routes/
│   │       ├── auth.routes.test.ts  # Auth integration tests
│   │       └── video.routes.test.ts # Video integration tests
│   ├── jest.config.ts             # Jest configuration
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── app/                   # Next.js App Router pages
│   │   ├── components/            # React components
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── lib/                   # Utilities & API client
│   │   ├── styles/                # Global styles
│   │   └── types/                 # TypeScript types
│   ├── package.json
│   └── next.config.js
├── docs/
│   ├── api.md                     # API documentation
│   ├── architecture.md            # Architecture overview
│   ├── deployment.md              # Deployment guide
│   └── provider-guide.md          # Provider plugin guide
├── docker/
│   ├── nginx.conf                 # Nginx configuration
│   └── prometheus.yml             # Monitoring config
└── README.md
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | 3000 | Server port |
| `NODE_ENV` | No | development | Environment |
| `DATABASE_URL` | **Yes** | - | PostgreSQL connection string |
| `REDIS_URL` | **Yes** | - | Redis connection string |
| `JWT_SECRET` | **Yes** | - | JWT signing secret |
| `JWT_EXPIRES_IN` | No | 7d | Token expiration |
| `CORS_ORIGIN` | No | http://localhost:5173 | Allowed CORS origin |
| `RATE_LIMIT_WINDOW` | No | 15 | Rate limit window (minutes) |
| `RATE_LIMIT_MAX` | No | 100 | Max requests per window |
| `UPLOAD_DIR` | No | ./uploads | File upload directory |
| `LOG_LEVEL` | No | debug | Logging level |

**AI Provider API Keys** (at least one required):
`GOOGLE_FLOW_API_KEY`, `OPENAI_API_KEY`, `RUNWAY_API_KEY`, `PIKA_API_KEY`, `LUMA_API_KEY`, `KLING_API_KEY`, `PIXVERSE_API_KEY`, `HAILUO_API_KEY`, `STABILITY_API_KEY`, `REPLICATE_API_KEY`, `FAL_API_KEY`

---

## Deployment Options

| Method | Complexity | Cost | Best For |
|---|---|---|---|
| **Docker Compose** | Medium | Low | Self-hosting on VPS |
| **AWS ECS** | High | Medium | Production scaling |
| **Railway / Render** | Low | Medium | Quick deployment |
| **Vercel (Frontend)** | Low | Free | Static frontend |

[Full Deployment Guide](docs/deployment.md)

---

## API Documentation

Interactive API documentation is available at `/api-docs` when the server is running.

**Quick Endpoint Reference:**

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | User login |
| GET | `/api/auth/me` | Yes | Get profile |
| POST | `/api/video/generate` | Yes | Generate video |
| GET | `/api/video/jobs` | Yes | List jobs |
| POST | `/api/prompt/enhance` | No | Enhance prompt |
| GET | `/api/providers` | Yes | List providers |
| GET | `/api/billing/plans` | No | Pricing plans |
| GET | `/api/health` | No | Health check |

[Full API Documentation](docs/api.md)

---

## Running Tests

```bash
cd backend
npm test

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch

# Specific test file
npm test -- --testPathPattern="auth"
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code patterns and conventions
- Write tests for new functionality
- Update API documentation for endpoint changes
- Run the full test suite before submitting
- Use conventional commit messages

### Adding a New Provider

See the [Provider Plugin Guide](docs/provider-guide.md) for detailed instructions on adding new AI video providers.

---

## License

This project is licensed under the MIT License — see the LICENSE file for details.

---

## Acknowledgments

- All AI video generation API providers for their incredible technology
- The open-source community for the amazing tools that make this possible
- Built with [Next.js](https://nextjs.org/), [Express.js](https://expressjs.com/), [Prisma](https://www.prisma.io/), and [BullMQ](https://docs.bullmq.io/)

---

<p align="center">
  Made with ❤️ by the NextGen Flow Pro Team
  <br>
  <a href="https://nextgenflowpro.com">Website</a> ·
  <a href="mailto:support@nextgenflowpro.com">Support</a> ·
  <a href="https://github.com/your-org/nextgen-flow-pro/issues">Issues</a>
</p>
