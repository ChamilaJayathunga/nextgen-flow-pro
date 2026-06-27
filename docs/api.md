# NextGen Flow Pro API Documentation

Base URL: `http://localhost:3000/api` (Development)
Base URL: `https://api.nextgenflowpro.com/api` (Production)

## Authentication

All authenticated endpoints require a Bearer JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

Tokens are obtained via `POST /api/auth/register` or `POST /api/auth/login`.

---

## Authentication Endpoints

### Register User

Creates a new user account.

**POST** `/api/auth/register`

**Auth Required:** No

**Request Body:**
```json
{
  "name": "string (1-100 chars, required)",
  "email": "string (valid email, required)",
  "password": "string (min 8 chars, required)"
}
```

**Response (201):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "role": "USER",
      "plan": "FREE",
      "createdAt": "2025-01-01T00:00:00.000Z"
    },
    "token": "jwt-token-string"
  }
}
```

**Error Responses:**
| Code | Status | Description |
|------|--------|-------------|
| VALIDATION_ERROR | 400 | Invalid input or duplicate email |
| INTERNAL_ERROR | 500 | Server error |

---

### Login

Authenticates an existing user.

**POST** `/api/auth/login`

**Auth Required:** No

**Request Body:**
```json
{
  "email": "string (valid email, required)",
  "password": "string (required)"
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "role": "USER|ADMIN",
      "plan": "FREE|PRO|ENTERPRISE",
      "credits": 100,
      "image": "string|null",
      "emailVerified": false,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    },
    "token": "jwt-token-string"
  }
}
```

**Error Responses:**
| Code | Status | Description |
|------|--------|-------------|
| VALIDATION_ERROR | 400 | Missing or invalid fields |
| AUTHENTICATION_ERROR | 401 | Invalid email or password |

---

### Logout

Clears the auth cookie.

**POST** `/api/auth/logout`

**Auth Required:** No

**Response (200):**
```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

---

### Get Current User Profile

Returns the authenticated user's profile.

**GET** `/api/auth/me`

**Auth Required:** Yes

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "role": "USER|ADMIN",
      "plan": "FREE|PRO|ENTERPRISE",
      "credits": 100,
      "image": "string|null",
      "emailVerified": true,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

**Error Responses:**
| Code | Status | Description |
|------|--------|-------------|
| AUTHENTICATION_ERROR | 401 | Missing or invalid token |
| NOT_FOUND | 404 | User not found |

---

### Update Profile

Updates the authenticated user's profile.

**PUT** `/api/auth/me`

**Auth Required:** Yes

**Request Body:**
```json
{
  "name": "string (1-100 chars, optional)",
  "email": "string (valid email, optional)",
  "image": "string (valid URL, optional, nullable)"
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "role": "USER|ADMIN",
      "plan": "FREE|PRO|ENTERPRISE",
      "image": "string|null",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

---

## Video Generation Endpoints

### Generate Video

Creates and queues a new video generation job.

**POST** `/api/video/generate`

**Auth Required:** Yes

**Content-Type:** `application/json` or `multipart/form-data`

**Request Body:**
```json
{
  "prompt": "string (1-5000 chars, required)",
  "provider": "string (optional, auto-selects best if omitted)",
  "enhancePrompt": "boolean (optional, default: false)",
  "options": {
    "duration": "number (1-120, optional, default: 5)",
    "resolution": "string (720p|1080p|4k, optional, default: 720p)",
    "style": "string (optional)",
    "negativePrompt": "string (optional)"
  }
}
```

**Response (201):**
```json
{
  "status": "success",
  "data": {
    "job": {
      "id": "uuid",
      "userId": "uuid",
      "prompt": "string",
      "provider": "string",
      "status": "PENDING",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

**Error Responses:**
| Code | Status | Description |
|------|--------|-------------|
| VALIDATION_ERROR | 400 | Invalid input or insufficient credits |
| AUTHENTICATION_ERROR | 401 | Not authenticated |

---

### List User Jobs

Returns paginated list of the authenticated user's video jobs.

**GET** `/api/video/jobs`

**Auth Required:** Yes

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | Page number (1-indexed) |
| limit | integer | No | 20 | Items per page (max 100) |
| status | enum | No | - | Filter by status (PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED) |
| provider | string | No | - | Filter by provider name |

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "data": [
      {
        "id": "uuid",
        "prompt": "string",
        "provider": "string",
        "status": "COMPLETED",
        "resultUrl": "string|null",
        "thumbnailUrl": "string|null",
        "progress": 100,
        "duration": 10.5,
        "cost": 0.63,
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-01T00:00:00.000Z"
      }
    ],
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

### Get Single Job

Returns details of a specific video job.

**GET** `/api/video/jobs/:id`

**Auth Required:** Yes

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | uuid | Job ID |

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "job": {
      "id": "uuid",
      "prompt": "string",
      "enhancedPrompt": "string|null",
      "provider": "string",
      "status": "COMPLETED",
      "resultUrl": "string|null",
      "thumbnailUrl": "string|null",
      "imageUrl": "string|null",
      "videoRefUrl": "string|null",
      "parameters": {},
      "errorMessage": "string|null",
      "progress": 100,
      "duration": 10.5,
      "cost": 0.63,
      "startedAt": "2025-01-01T00:00:00.000Z|null",
      "completedAt": "2025-01-01T00:00:00.000Z|null",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z",
      "user": {
        "id": "uuid",
        "name": "string",
        "email": "string"
      }
    }
  }
}
```

**Error Responses:**
| Code | Status | Description |
|------|--------|-------------|
| NOT_FOUND | 404 | Job not found |

---

### Delete Job

Deletes a video job (only if not currently processing).

**DELETE** `/api/video/jobs/:id`

**Auth Required:** Yes

**Response (200):**
```json
{
  "status": "success",
  "message": "Job deleted successfully"
}
```

**Error Responses:**
| Code | Status | Description |
|------|--------|-------------|
| NOT_FOUND | 404 | Job not found |
| VALIDATION_ERROR | 400 | Cannot delete processing job |

---

### Cancel Job

Cancels a pending or processing job.

**POST** `/api/video/jobs/:id/cancel`

**Auth Required:** Yes

**Response (200):**
```json
{
  "status": "success",
  "message": "Job cancelled successfully"
}
```

**Error Responses:**
| Code | Status | Description |
|------|--------|-------------|
| NOT_FOUND | 404 | Job not found |
| VALIDATION_ERROR | 400 | Job already completed or cancelled |

---

### Batch Generate

Creates multiple video generation jobs in a single request.

**POST** `/api/video/batch`

**Auth Required:** Yes

**Request Body:**
```json
{
  "prompts": ["array of strings (1-50 items, required)"],
  "provider": "string (optional)",
  "options": {
    "duration": "number (1-120, optional)",
    "resolution": "string (720p|1080p|4k, optional)",
    "style": "string (optional)"
  }
}
```

**Response (201):**
```json
{
  "status": "success",
  "data": {
    "jobs": [
      { "id": "uuid", "userId": "uuid", "prompt": "string", "provider": "string", "status": "PENDING", "createdAt": "2025-01-01T00:00:00.000Z" }
    ],
    "total": 5
  }
}
```

---

### Get Job Stats

Returns statistics about the user's video jobs.

**GET** `/api/video/stats`

**Auth Required:** Yes

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "stats": {
      "total": 42,
      "pending": 5,
      "processing": 2,
      "completed": 30,
      "failed": 3,
      "cancelled": 2,
      "totalCost": 18.50,
      "avgDuration": 8.3
    }
  }
}
```

---

## Prompt Endpoints

### Enhance Prompt

Enhances a video prompt with style, mood, and keyword analysis.

**POST** `/api/prompt/enhance`

**Auth Required:** No (optional auth recommended for rate limiting)

**Request Body:**
```json
{
  "prompt": "string (1-5000 chars, required)"
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "original": "a dragon flying over mountains",
    "enhanced": "a dragon flying over mountains. Fantasy realm with magical elements, otherworldly landscapes, and mythical creatures. Dramatic atmosphere with high contrast and emotional intensity. Key elements: dragon, flying, mountains.",
    "keywords": ["dragon", "flying", "mountains"],
    "style": "fantasy",
    "mood": "dramatic"
  }
}
```

---

### Generate Storyboard

Creates a multi-scene storyboard from a prompt.

**POST** `/api/prompt/storyboard`

**Auth Required:** No (optional auth recommended)

**Request Body:**
```json
{
  "prompt": "string (1-5000 chars, required)"
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "title": "A dragon flying",
    "prompt": "a dragon flying over mountains",
    "scenes": [
      {
        "sceneNumber": 1,
        "description": "Scene description...",
        "duration": 5,
        "visualNotes": "Lighting: Golden hour lighting. Color palette: Warm earth tones.",
        "cameraDirection": "Wide establishing shot"
      }
    ],
    "totalDuration": 30
  }
}
```

---

### List Prompt Templates

Returns paginated public prompt templates.

**GET** `/api/prompt/templates`

**Auth Required:** No (optional auth)

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| category | string | No | - | Filter by category |
| page | integer | No | 1 | Page number |
| limit | integer | No | 20 | Items per page (max 100) |

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "data": [
      {
        "id": "uuid",
        "title": "Epic Cinematic Landscape",
        "content": "template content with {placeholders}",
        "category": "Cinematic",
        "isPublic": true,
        "createdAt": "2025-01-01T00:00:00.000Z"
      }
    ],
    "total": 10,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### Create Prompt Template

Creates a new prompt template.

**POST** `/api/prompt/templates`

**Auth Required:** Yes

**Request Body:**
```json
{
  "title": "string (1-200 chars, required)",
  "content": "string (1-10000 chars, required)",
  "category": "string (max 100, optional)",
  "isPublic": "boolean (optional, default: true)"
}
```

**Response (201):**
```json
{
  "status": "success",
  "data": {
    "template": {
      "id": "uuid",
      "title": "string",
      "content": "string",
      "category": "string|null",
      "isPublic": true,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

---

### Update Prompt Template

Updates an existing prompt template.

**PUT** `/api/prompt/templates/:id`

**Auth Required:** Yes (must own the template or it must be unowned)

**Request Body:**
```json
{
  "title": "string (optional)",
  "content": "string (optional)",
  "category": "string|null (optional)",
  "isPublic": "boolean (optional)"
}
```

---

### Delete Prompt Template

Deletes a prompt template.

**DELETE** `/api/prompt/templates/:id`

**Auth Required:** Yes

---

## Provider Endpoints

### List Providers

Returns all registered AI video providers with metrics.

**GET** `/api/providers`

**Auth Required:** Yes

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "providers": [
      {
        "name": "googleFlow",
        "displayName": "GoogleFlow",
        "capabilities": ["text-to-video", "image-to-video"],
        "isAvailable": true,
        "metrics": {
          "successRate": 0.96,
          "avgLatency": 3200,
          "totalJobs": 1478,
          "lastUsedAt": "2025-01-01T00:00:00.000Z"
        }
      }
    ]
  }
}
```

---

### Get Single Provider

Returns details of a specific provider.

**GET** `/api/providers/:name`

**Auth Required:** Yes

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| name | string | Provider name (e.g., openai, runway) |

---

### Get Provider Performance Stats (Admin)

**GET** `/api/providers/stats/performance`

**Auth Required:** Yes (Admin only)

---

## Admin Endpoints

All admin endpoints require the `ADMIN` role.

### List Users

**GET** `/api/admin/users`

**Query Parameters:** `page`, `limit`

### Get Single User

**GET** `/api/admin/users/:id`

### Update User

**PUT** `/api/admin/users/:id`

**Request Body:**
```json
{
  "name": "string (optional)",
  "email": "string (optional)",
  "role": "USER|ADMIN (optional)",
  "plan": "FREE|PRO|ENTERPRISE (optional)",
  "credits": "number (optional)"
}
```

### Delete User

**DELETE** `/api/admin/users/:id`

### Get System Stats

**GET** `/api/admin/stats`

### List All Jobs

**GET** `/api/admin/jobs`

**Query Parameters:** `page`, `limit`, `status`, `provider`

### Update Job

**PUT** `/api/admin/jobs/:id`

**Request Body:**
```json
{
  "status": "PENDING|PROCESSING|COMPLETED|FAILED|CANCELLED (optional)",
  "resultUrl": "string|null (optional)",
  "thumbnailUrl": "string|null (optional)",
  "errorMessage": "string|null (optional)",
  "progress": "number (0-100, optional)",
  "cost": "number (optional)"
}
```

---

## Analytics Endpoints

### User Usage Stats

**GET** `/api/analytics/usage?days=30`

**Auth Required:** Yes

### Provider Breakdown

**GET** `/api/analytics/providers`

**Auth Required:** Yes

### Trends

**GET** `/api/analytics/trends?days=30`

**Auth Required:** Yes

---

## Billing Endpoints

### Get Pricing Plans

**GET** `/api/billing/plans`

**Auth Required:** No

### Get Credits

**GET** `/api/billing/credits`

**Auth Required:** Yes

### Purchase Credits

**POST** `/api/billing/credits`

**Auth Required:** Yes

**Request Body:**
```json
{
  "amount": "number (1-100000, required)",
  "paymentMethod": "string (optional)"
}
```

### Subscribe to Plan

**POST** `/api/billing/subscribe`

**Auth Required:** Yes

**Request Body:**
```json
{
  "planId": "string (required: free|pro|enterprise)"
}
```

---

## Favorites Endpoints

### List Favorites

**GET** `/api/favorites`

**Auth Required:** Yes

### Add Favorite

**POST** `/api/favorites`

**Request Body:**
```json
{
  "videoJobId": "uuid (required)"
}
```

### Remove Favorite

**DELETE** `/api/favorites/:jobId`

**Auth Required:** Yes

---

## WebSocket Events

Connect to `ws://localhost:3000` with Socket.IO.

**Authentication:** Pass JWT token in `auth.token` or `query.token` during handshake.

### Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `subscribe:job` | `jobId: string` | Subscribe to real-time updates for a specific job |
| `unsubscribe:job` | `jobId: string` | Unsubscribe from job updates |

### Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `connected` | `{ userId, message }` | Confirmation of successful connection |
| `job:update` | `{ jobId, status, progress }` | Job status or progress change |
| `job:completed` | `{ jobId, status, resultUrl, thumbnailUrl, duration, progress }` | Job completed successfully |
| `job:failed` | `{ jobId, status, error }` | Job failed with error message |

---

## Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Request validation failed |
| AUTHENTICATION_ERROR | 401 | Missing or invalid authentication |
| AUTHORIZATION_ERROR | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Requested resource not found |
| RATE_LIMIT_ERROR | 429 | Too many requests |
| PROVIDER_ERROR | 502 | AI provider error |
| QUEUE_ERROR | 500 | Queue system error |
| INTERNAL_ERROR | 500 | Unexpected server error |

All errors follow the format:
```json
{
  "status": "error",
  "message": "Human-readable error description",
  "code": "ERROR_CODE",
  "details": { "field": ["error message per field"] },
  "stack": "stack trace (development only)"
}
```

---

## Rate Limiting

- **Window:** 15 minutes (configurable via `RATE_LIMIT_WINDOW`)
- **Max Requests:** 100 per window (configurable via `RATE_LIMIT_MAX`)
- **Header:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Response on limit:** HTTP 429 with `RATE_LIMIT_ERROR` code

---

## Pagination

All list endpoints support pagination with the following parameters:
- `page` (integer, default: 1)
- `limit` (integer, default: 20, max: 100)

Response includes:
```json
{
  "data": [...],
  "total": 42,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```
