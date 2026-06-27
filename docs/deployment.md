# Deployment Guide

## Prerequisites

- **Node.js** v20+ (LTS recommended)
- **Docker** & Docker Compose v2+
- **PostgreSQL** 15+
- **Redis** 7+
- **Git**
- **Nginx** (for production reverse proxy)
- **Certbot** (for SSL certificates)

---

## Local Development Setup

### 1. Clone and Install

```bash
git clone https://github.com/your-org/nextgen-flow-pro.git
cd nextgen-flow-pro

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env.local
```

**Required Backend Variables:**
```env
# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/nextgen_flow_pro

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Upload
UPLOAD_DIR=./uploads

# Logging
LOG_LEVEL=debug

# AI Providers (at least one key required)
OPENAI_API_KEY=sk-...
RUNWAY_API_KEY=...
```

**Required Frontend Variables:**
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_WS_URL=http://localhost:3000
```

### 3. Start Dependencies

```bash
# Start PostgreSQL and Redis (using Docker)
docker run -d --name pg -p 5432:5432 \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=nextgen_flow_pro \
  postgres:15

docker run -d --name redis -p 6379:6379 redis:7
```

### 4. Database Setup

```bash
cd backend

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed demo data
npm run prisma:seed
```

### 5. Start Development Servers

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

Visit:
- Frontend: http://localhost:5173
- API: http://localhost:3000
- API Docs: http://localhost:3000/api-docs
- Health: http://localhost:3000/health

---

## Docker Deployment

### Docker Compose (Full Stack)

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: nextgen
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: nextgen_flow_pro
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - nextgen-network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data
    networks:
      - nextgen-network
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: postgresql://nextgen:${DB_PASSWORD}@postgres:5432/nextgen_flow_pro
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGIN: https://app.nextgenflowpro.com
      LOG_LEVEL: info
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      RUNWAY_API_KEY: ${RUNWAY_API_KEY}
    depends_on:
      - postgres
      - redis
    networks:
      - nextgen-network
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "5173:5173"
    environment:
      NEXT_PUBLIC_API_URL: https://api.nextgenflowpro.com/api
      NEXT_PUBLIC_WS_URL: https://api.nextgenflowpro.com
    depends_on:
      - backend
    networks:
      - nextgen-network
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx.conf:/etc/nginx/nginx.conf
      - ./docker/ssl:/etc/nginx/ssl
      - certbot-data:/var/www/certbot
    depends_on:
      - backend
      - frontend
    networks:
      - nextgen-network
    restart: unless-stopped

volumes:
  pgdata:
  redisdata:
  certbot-data:

networks:
  nextgen-network:
    driver: bridge
```

### Dockerfile (Backend)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
RUN npx prisma generate
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### Build & Run

```bash
# Build and start all services
docker-compose up -d --build

# Run database migrations
docker-compose exec backend npx prisma migrate deploy

# Seed database
docker-compose exec backend npx tsx prisma/seed.ts

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

---

## Production Deployment

### Option A: VPS with Docker (Recommended)

1. **Provision a VPS** (Ubuntu 22.04 LTS, 4GB RAM, 2 CPU, 80GB SSD)

2. **Initial Setup:**
```bash
ssh root@your-server-ip

# Install Docker
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin

# Clone repository
git clone https://github.com/your-org/nextgen-flow-pro.git /opt/nextgen
cd /opt/nextgen

# Create environment file
cp .env.production.example .env
nano .env  # Fill in all values
```

3. **Start Services:**
```bash
docker compose up -d
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx tsx prisma/seed.ts
```

### Option B: AWS ECS

1. Create ECR repositories for `backend` and `frontend`
2. Build and push Docker images:
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com

docker build -t nextgen-backend ./backend
docker tag nextgen-backend:latest $AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/nextgen-backend:latest
docker push $AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/nextgen-backend:latest
```
3. Create ECS task definitions with environment variables
4. Set up RDS for PostgreSQL and ElastiCache for Redis
5. Configure Application Load Balancer with SSL
6. Deploy with ECS Fargate

### Option C: Vercel + Railway

**Frontend:** Deploy to Vercel
```bash
npx vercel --prod
```

**Backend:** Deploy to Railway or Render
```bash
# Railway CLI
railway login
cd backend
railway up
```

---

## SSL Setup with Let's Encrypt

```bash
# Install certbot
apt-get install -y certbot python3-certbot-nginx

# Obtain certificate
certbot --nginx -d api.nextgenflowpro.com -d app.nextgenflowpro.com

# Auto-renewal (already configured by certbot)
certbot renew --dry-run
```

---

## Monitoring Setup

### Application Monitoring

```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./docker/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - nextgen-network

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    networks:
      - nextgen-network
```

### Log Management

```yaml
# docker-compose.logging.yml
services:
  loki:
    image: grafana/loki
    ports:
      - "3100:3100"

  promtail:
    image: grafana/promtail
    volumes:
      - /var/log:/var/log
      - ./docker/promtail.yml:/etc/promtail/config.yml
```

### Health Checks

Monitor these endpoints:
- `/health` - Basic health check
- `/api/video/stats` - System usage metrics
- `/api/admin/stats` - Admin dashboard data

---

## Backup Procedures

### Database Backup

```bash
# Automated daily backup
0 2 * * * docker exec pg pg_dump -U nextgen nextgen_flow_pro > /backups/nextgen_$(date +\%Y\%m\%d).sql

# Keep last 30 days
0 3 * * * find /backups -name "*.sql" -mtime +30 -delete

# Backup with compression
pg_dump -U nextgen nextgen_flow_pro | gzip > /backups/nextgen_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Redis Backup

```bash
# RDB snapshot (already enabled by default)
# Snapshot location: /data/dump.rdb

# Manual backup
docker exec redis redis-cli SAVE
docker cp redis:/data/dump.rdb /backups/redis_$(date +%Y%m%d).rdb
```

### Uploaded Files

```bash
# Sync uploads to S3
aws s3 sync ./uploads s3://nextgen-flow-pro-uploads/ --delete
```

---

## Database Migrations

```bash
# Development
cd backend
npx prisma migrate dev --name describe_changes

# Production
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset

# View migration status
npx prisma migrate status
```

---

## Scaling Considerations

### Horizontal Scaling

- **Backend API:** Run multiple instances behind a load balancer
- **Workers:** Increase worker concurrency or spawn additional worker processes
- **Redis:** Use Redis Cluster for high availability
- **Database:** Enable PostgreSQL read replicas for analytics queries

### Vertical Scaling

- Increase worker `concurrency` parameter (max 10 per instance)
- Adjust BullMQ lock duration for long-running jobs
- Increase Node.js memory limit: `NODE_OPTIONS="--max-old-space-size=4096"`

### Performance Tuning

```env
# Backend performance tuning
NODE_ENV=production
LOG_LEVEL=warn
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=500  # Higher for production

# Worker concurrency (adjust based on CPU cores)
WORKER_CONCURRENCY=5

# Database connection pool
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=20
```

---

## Troubleshooting

### Common Issues

**Database connection refused:**
```bash
# Check PostgreSQL is running
docker ps | grep postgres
# Check connection string
echo $DATABASE_URL
# Test connection
docker exec -it pg psql -U nextgen nextgen_flow_pro
```

**Redis connection issues:**
```bash
# Check Redis is running
docker ps | grep redis
# Test connection
docker exec -it redis redis-cli ping
# Should return: PONG
```

**JWT token errors:**
```bash
# Verify JWT_SECRET is set
echo $JWT_SECRET
# Tokens invalid after secret change? Regenerate:
# Users will need to re-login
```

**Provider API errors:**
```bash
# Check provider API keys
docker compose exec backend env | grep API_KEY
# Check provider health
curl http://localhost:3000/api/providers
```

**File upload failures:**
```bash
# Check upload directory exists and has correct permissions
ls -la ./uploads
chmod 755 ./uploads
```

**Worker not processing jobs:**
```bash
# Check Redis connectivity
# Restart worker
docker compose restart backend
# View worker logs
docker compose logs backend | grep worker
```

### Debug Mode

```env
# Enable verbose logging
LOG_LEVEL=debug

# Enable stack traces in responses
NODE_ENV=development

# Inspect queue stats
curl http://localhost:3000/api/admin/stats
```
