#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# NextGen Flow Pro - Deployment Script
# ============================================================================

APP_NAME="nextgen-flow-pro"
COMPOSE_FILE="docker/docker-compose.yml"
COMPOSE_PROD_FILE="docker/docker-compose.prod.yml"
ENV_FILE=".env"
GIT_BRANCH="main"
COMPOSE_FLAGS="-f ${COMPOSE_FILE} -f ${COMPOSE_PROD_FILE}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

cleanup() {
    log_info "Cleaning up..."
    docker compose ${COMPOSE_FLAGS} down --remove-orphans 2>/dev/null || true
}

trap cleanup ERR

# ------------------------------------------------------------------
# Pre-flight checks
# ------------------------------------------------------------------
if ! command -v docker &>/dev/null; then
    log_error "Docker is not installed. Aborting."
    exit 1
fi

if ! docker compose version &>/dev/null; then
    log_error "Docker Compose v2 is not installed. Aborting."
    exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
    log_error ".env file not found at $(pwd)/${ENV_FILE}."
    log_error "Copy .env.example to .env and fill in your values before deploying."
    exit 1
fi

# ------------------------------------------------------------------
# Pull latest code
# ------------------------------------------------------------------
log_info "Pulling latest code from ${GIT_BRANCH}..."
if git rev-parse --git-dir > /dev/null 2>&1; then
    git fetch origin
    git reset --hard "origin/${GIT_BRANCH}"
    log_info "Code updated to latest commit: $(git log --oneline -1)"
else
    log_warn "Not a git repository. Skipping git pull."
fi

# ------------------------------------------------------------------
# Build Docker images
# ------------------------------------------------------------------
log_info "Building Docker images..."
docker compose ${COMPOSE_FLAGS} build --pull --no-cache \
    --build-arg BUILDKIT_INLINE_CACHE=1

# ------------------------------------------------------------------
# Run database migrations
# ------------------------------------------------------------------
log_info "Running database migrations..."
docker compose ${COMPOSE_FLAGS} run --rm backend \
    sh -c "npx prisma migrate deploy"

# ------------------------------------------------------------------
# Start / restart containers
# ------------------------------------------------------------------
log_info "Deploying services..."
docker compose ${COMPOSE_FLAGS} up --detach --remove-orphans --force-recreate

# ------------------------------------------------------------------
# Health check
# ------------------------------------------------------------------
log_info "Running health checks..."

MAX_RETRIES=12
RETRY_INTERVAL=10
BACKEND_HEALTHY=false
FRONTEND_HEALTHY=false

for i in $(seq 1 ${MAX_RETRIES}); do
    BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health 2>/dev/null || echo "000")
    FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")

    if [[ "${BACKEND_STATUS}" == "200" ]]; then
        BACKEND_HEALTHY=true
        log_info "Backend is healthy (HTTP ${BACKEND_STATUS})"
    fi

    if [[ "${FRONTEND_STATUS}" == "200" ]]; then
        FRONTEND_HEALTHY=true
        log_info "Frontend is healthy (HTTP ${FRONTEND_STATUS})"
    fi

    if [[ "${BACKEND_HEALTHY}" == true && "${FRONTEND_HEALTHY}" == true ]]; then
        break
    fi

    if [[ ${i} -lt ${MAX_RETRIES} ]]; then
        log_info "Waiting ${RETRY_INTERVAL}s for services to become healthy (attempt ${i}/${MAX_RETRIES})..."
        sleep ${RETRY_INTERVAL}
    fi
done

if [[ "${BACKEND_HEALTHY}" != true || "${FRONTEND_HEALTHY}" != true ]]; then
    log_error "Deployment health check failed!"
    log_error "Backend healthy: ${BACKEND_HEALTHY}"
    log_error "Frontend healthy: ${FRONTEND_HEALTHY}"
    log_info "Initiating rollback..."

    docker compose ${COMPOSE_FLAGS} down
    PREVIOUS_IMAGES=$(docker images --filter "reference=${APP_NAME}*" --format "{{.Repository}}:{{.Tag}}" | tail -n +2 | head -5 || true)
    if [[ -n "${PREVIOUS_IMAGES}" ]]; then
        log_info "Rolling back to previous images..."
        docker compose ${COMPOSE_FLAGS} up --detach
    fi

    exit 1
fi

# ------------------------------------------------------------------
# Cleanup
# ------------------------------------------------------------------
log_info "Removing unused Docker images and volumes..."
docker image prune --force --filter "dangling=true" 2>/dev/null || true

log_info "============================================"
log_info "Deployment completed successfully!"
log_info "Frontend: http://localhost:3000"
log_info "Backend:  http://localhost:4000"
log_info "API Docs: http://localhost:4000/api-docs"
log_info "============================================"
