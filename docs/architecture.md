# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Next.js App  │  │  Mobile App  │  │  Third-Party API     │  │
│  │ (React/SSR)  │  │  (React Nat.)│  │  Consumers           │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
└─────────┼─────────────────┼──────────────────────┼──────────────┘
          │                 │                      │
    ┌─────┴─────────────────┴──────────────────────┴─────┐
    │                   API GATEWAY                        │
    │  ┌───────────────────────────────────────────────┐  │
    │  │  Express.js REST API + Socket.IO (WebSocket)  │  │
    │  │  Rate Limiter | Auth Middleware | Validator   │  │
    │  └──────────────────────┬────────────────────────┘  │
    └─────────────────────────┼───────────────────────────┘
                              │
    ┌─────────────────────────┼───────────────────────────┐
    │                    APPLICATION LAYER                 │
    │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
    │  │  Auth    │ │  Video   │ │  Prompt  │ │Billing │ │
    │  │ Service  │ │  Service │ │  Service │ │Service │ │
    │  └──────────┘ └────┬─────┘ └──────────┘ └────────┘ │
    │                    │                                 │
    │  ┌─────────────────┴──────────────────────────────┐  │
    │  │          Queue System (BullMQ + Redis)         │  │
    │  │  ┌──────────────┐  ┌──────────────────────┐   │  │
    │  │  │  Video Gen   │  │  Thumbnail/Enhance   │   │  │
    │  │  │  Queue       │  │  Queue               │   │  │
    │  │  └──────┬───────┘  └──────────────────────┘   │  │
    │  └─────────┼─────────────────────────────────────┘  │
    └────────────┼────────────────────────────────────────┘
                 │
    ┌────────────┼────────────────────────────────────────┐
    │       PROVIDER PLUGIN LAYER                          │
    │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
    │  │ Google   │ │  OpenAI  │ │  Runway  │ │  Pika  │ │
    │  │ Flow     │ │          │ │          │ │        │ │
    │  ├──────────┤ ├──────────┤ ├──────────┤ ├────────┤ │
    │  │ Luma     │ │  Kling   │ │ Pixverse │ │ Hailuo │ │
    │  ├──────────┤ ├──────────┤ ├──────────┤ ├────────┤ │
    │  │Stability │ │Replicate │ │   Fal    │ │        │ │
    │  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
    │                Provider Registry                     │
    └──────────────────────┬──────────────────────────────┘
                           │
    ┌──────────────────────┴──────────────────────────────┐
    │                  DATA LAYER                          │
    │  ┌─────────────────┐  ┌─────────────────────────┐   │
    │  │   PostgreSQL    │  │     Redis Cache          │   │
    │  │   (Primary DB)  │  │  (Session, Queue, Cache) │   │
    │  └─────────────────┘  └─────────────────────────┘   │
    │  ┌─────────────────┐                                │
    │  │   S3/Storage    │                                │
    │  │ (Video/Images)  │                                │
    │  └─────────────────┘                                │
    └─────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. API Gateway (Express.js)

The entry point for all client requests. Handles:
- **Authentication** via JWT middleware
- **Rate limiting** with configurable windows
- **Request validation** using Zod schemas
- **CORS** configuration for frontend access
- **Helmet** security headers

### 2. Application Services

#### Auth Service (`src/core/auth/`)
- JWT generation and verification (HS256)
- Password hashing with bcryptjs (12 salt rounds)
- Role-based access control (USER, ADMIN)
- Optional auth for public endpoints

#### Video Service (`src/services/job.service.ts`)
- CRUD operations for video generation jobs
- Pagination with configurable limits
- Status filtering and sorting
- Provider usage tracking via Prisma

#### Provider Service (`src/services/provider.service.ts`)
- Smart provider selection based on success metrics
- Fallback chain on provider failure
- Cost estimation for video generation
- Provider health monitoring

#### Prompt Service (`src/services/prompt.service.ts`)
- Keyword extraction and analysis
- Style and mood detection
- Prompt enhancement with contextual descriptions
- Storyboard generation with scene splitting
- Template management

#### Billing Service (`src/services/billing.service.ts`)
- Multi-tier pricing (Free, Pro, Enterprise)
- Credit-based usage tracking
- Plan limit enforcement (duration, resolution, providers)
- Cost calculation with multiplier system

#### Analytics Service (`src/services/analytics.service.ts`)
- User-level usage statistics
- Provider performance tracking
- System-wide metrics
- Daily trends and aggregations

### 3. Queue System (BullMQ + Redis)

```
┌─────────────────────────────────────────────┐
│              Redis Instance                   │
│  ┌──────────────┐  ┌────────────────────┐   │
│  │ Video Gen    │  │ Prompt Enhance     │   │
│  │ Queue        │  │ Queue              │   │
│  ├──────────────┤  ├────────────────────┤   │
│  │ Jobs: 0-100  │  │ Jobs: 0-50         │   │
│  │ Workers: 3   │  │ Workers: 2         │   │
│  └──────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────┘
```

Key features:
- **Exponential backoff** for retries (2s initial, max 3 attempts)
- **Job prioritization** for premium users
- **Delayed jobs** for scheduled generation
- **Automatic cleanup** (24h for completed, 48h for failed)
- **Stalled job detection** (30s interval, 3 max stalls)

### 4. Provider Plugin Architecture

```
src/providers/
├── interface.ts          # Provider interface definition
├── registry.ts           # Provider registry (singleton)
├── google-flow/          # Google Flow provider
├── openai/               # OpenAI video provider
├── runway/               # RunwayML provider
├── pika/                 # Pika Labs provider
├── luma/                 # Luma AI provider
├── kling/                # Kling AI provider
├── pixverse/             # Pixverse provider
├── hailuo/               # Hailuo AI provider
├── stability/            # Stability AI provider
├── replicate/            # Replicate provider
└── fal/                  # Fal AI provider
```

Each provider implements the `Provider` interface:
```typescript
interface Provider {
  name: string;
  displayName: string;
  capabilities: string[];
  baseUrl: string;
  isAvailable: boolean;
  generateVideo(options: GenerateVideoOptions): Promise<VideoJobStatus>;
  getStatus(jobId: string): Promise<VideoJobStatus>;
  cancelJob(jobId: string): Promise<boolean>;
}
```

### 5. WebSocket System (Socket.IO)

Real-time updates for video generation progress:
- Authenticated connections with JWT verification
- User-specific rooms (`user:{userId}`)
- Job-specific rooms (`job:{jobId}`)
- Events: `connected`, `job:update`, `job:completed`, `job:failed`

---

## Data Flow

### Video Generation Flow

```
User → POST /api/video/generate → Auth Middleware
  → Validation Middleware
  → Billing Service (check credits)
  → Job Service (create job record)
  → Queue Service (add to BullMQ)
  → Response (201 Created with job ID)

  ↓ (Background via Worker)

  Worker picks up job → Update status to PROCESSING
    → WebSocket: emit job:update
    → Provider Service (select best or specified provider)
    → Provider.generateVideo() → AI API call
    → WebSocket: emit job:completed (or job:failed)
    → Update job record with results
    → Deduct credits
```

### Provider Selection Flow

```
Request comes in with or without preferred provider

  ┌── With preferred provider?
  │   ├─ Yes → Get from registry → Check availability
  │   │        ├─ Available → Execute → Update metrics
  │   │        └─ Unavailable → Throw ProviderError
  │   └─ No → Fallback enabled?
  │             ├─ Yes → Get all available providers
  │             │        → Sort by success rate × latency
  │             │        → Try each until one succeeds
  │             │        → Update metrics per attempt
  │             │        → All fail → Throw error
  │             └─ No → Get best provider from registry
  │                      → Execute → Update metrics
```

---

## Security Architecture

### Authentication Flow

```
1. User registers/logs in via POST /api/auth/*
2. Server validates credentials, returns JWT
3. Client stores JWT (localStorage/httpOnly cookie)
4. All subsequent requests include: Authorization: Bearer <token>
5. Middleware verifies token on each protected route
6. Token payload includes: userId, email, role
7. Token expires after configured period (default: 7 days)
```

### Security Measures

| Measure | Implementation |
|---------|---------------|
| Password hashing | bcryptjs, 12 salt rounds |
| JWT signing | HS256 with secure secret |
| Token expiry | Configurable (default 7d) |
| CORS | Restricted to frontend origin |
| Helmet headers | XSS, content-type, framing protection |
| Rate limiting | Per-IP, configurable window/max |
| Input validation | Zod schemas on all endpoints |
| SQL injection | Prisma ORM (parameterized queries) |
| File uploads | Size limits, type validation |
| Error exposure | No stack traces in production |

---

## Performance Considerations

### Database Optimization

- **Indexed fields:** userId, status, provider, createdAt
- **Composite indexes** for common query patterns
- **Selective queries** using Prisma `select` (no `SELECT *`)
- **Connection pooling** with configurable pool size
- **Raw SQL** for complex analytics aggregations

### Caching Strategy

```
┌──────────────────────────┐
│    In-Memory (Node.js)   │
│  - Provider Registry     │
│  - Pricing Plans         │
│  - Configuration         │
├──────────────────────────┤
│    Redis Cache           │
│  - Session Data          │
│  - Queue State           │
│  - Rate Limit Counters   │
├──────────────────────────┤
│    Database (PostgreSQL) │
│  - User Data             │
│  - Job Records           │
│  - Usage Analytics       │
└──────────────────────────┘
```

### Queue Optimization

- **Concurrent workers:** 3-5 per queue instance
- **Job retries:** 3 attempts with exponential backoff
- **Stalled job detection:** 30s interval
- **Job cleanup:** Completed jobs removed after 24h
- **Priority levels:** VIP users get priority queue

### API Response Optimization

- **Pagination** on all list endpoints (max 100 per page)
- **Selective field returns** (no unnecessary data)
- **Compression** via Nginx gzip
- **HTTP/2** support for multiplexed requests
- **Keep-alive** connections for reduced latency
