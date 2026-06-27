import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition: swaggerJsdoc.Options['definition'] = {
  openapi: '3.0.0',
  info: {
    title: 'NextGen Flow Pro API',
    version: '1.0.0',
    description: `AI Video Generation Platform - REST API Documentation

NextGen Flow Pro is a comprehensive AI video generation SaaS platform that provides access to 11+ AI video providers through a unified API. This API allows you to generate videos, manage jobs, enhance prompts, track analytics, and handle billing.

## Authentication
Most endpoints require a Bearer JWT token. Obtain tokens via POST /api/auth/register or POST /api/auth/login.

## Rate Limiting
API requests are rate-limited per IP address. Default: 100 requests per 15-minute window.

## Pagination
List endpoints support pagination with \`page\` (default: 1) and \`limit\` (default: 20, max: 100) query parameters.`,
    contact: {
      name: 'NextGen Flow Pro Support',
      email: 'support@nextgenflowpro.com',
      url: 'https://nextgenflowpro.com/support',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
    {
      url: 'https://api.nextgenflowpro.com',
      description: 'Production server',
    },
    {
      url: 'https://staging-api.nextgenflowpro.com',
      description: 'Staging server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token. Get it from POST /api/auth/login',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['status', 'message', 'code'],
        properties: {
          status: { type: 'string', example: 'error' },
          message: { type: 'string', example: 'Resource not found' },
          code: { type: 'string', example: 'NOT_FOUND' },
          details: {
            type: 'object',
            additionalProperties: {
              type: 'array',
              items: { type: 'string' },
            },
            description: 'Validation error details (field-specific)',
          },
          stack: {
            type: 'string',
            description: 'Stack trace (development only)',
          },
        },
      },
      ValidationError: {
        allOf: [
          { $ref: '#/components/schemas/Error' },
          {
            properties: {
              code: { example: 'VALIDATION_ERROR' },
              details: {
                type: 'object',
                example: { email: ['Email is already in use'] },
              },
            },
          },
        ],
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Unique user identifier' },
          name: { type: 'string', description: 'User display name' },
          email: { type: 'string', format: 'email', description: 'User email address' },
          role: {
            type: 'string',
            enum: ['USER', 'ADMIN'],
            description: 'User role for authorization',
          },
          plan: {
            type: 'string',
            enum: ['FREE', 'PRO', 'ENTERPRISE'],
            description: 'Current subscription plan',
          },
          credits: { type: 'integer', description: 'Available credits' },
          image: { type: 'string', format: 'uri', nullable: true, description: 'Profile image URL' },
          emailVerified: { type: 'boolean', description: 'Whether email is verified' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      VideoJob: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          prompt: { type: 'string', description: 'Original generation prompt' },
          enhancedPrompt: { type: 'string', nullable: true, description: 'AI-enhanced prompt' },
          provider: { type: 'string', description: 'AI provider used' },
          status: {
            type: 'string',
            enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'],
          },
          progress: { type: 'integer', minimum: 0, maximum: 100 },
          resultUrl: { type: 'string', format: 'uri', nullable: true },
          thumbnailUrl: { type: 'string', format: 'uri', nullable: true },
          errorMessage: { type: 'string', nullable: true },
          duration: { type: 'number', nullable: true, description: 'Video duration in seconds' },
          cost: { type: 'number', nullable: true, description: 'Generation cost in USD' },
          parameters: { type: 'object', description: 'Generation parameters' },
          startedAt: { type: 'string', format: 'date-time', nullable: true },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      PaginatedResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: { type: 'object' },
          },
          total: { type: 'integer', description: 'Total number of items' },
          page: { type: 'integer', description: 'Current page number' },
          limit: { type: 'integer', description: 'Items per page' },
          totalPages: { type: 'integer', description: 'Total number of pages' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          data: {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/User' },
              token: { type: 'string', description: 'JWT token for authentication' },
            },
          },
        },
      },
      Provider: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Provider unique identifier' },
          displayName: { type: 'string', description: 'Human-readable provider name' },
          capabilities: {
            type: 'array',
            items: { type: 'string' },
            description: 'Supported generation capabilities',
          },
          isAvailable: { type: 'boolean' },
          metrics: {
            type: 'object',
            nullable: true,
            properties: {
              successRate: { type: 'number', format: 'float' },
              avgLatency: { type: 'number', description: 'Average response time in ms' },
              totalJobs: { type: 'integer' },
              lastUsedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      PromptTemplate: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          content: { type: 'string' },
          category: { type: 'string', nullable: true },
          isPublic: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      BillingPlan: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number' },
          credits: { type: 'integer' },
          features: { type: 'array', items: { type: 'string' } },
          maxDuration: { type: 'integer' },
          maxResolution: { type: 'string' },
          concurrentJobs: { type: 'integer' },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
              example: {
                status: 'error',
                message: 'No authorization header provided',
                code: 'AUTHENTICATION_ERROR',
              },
            },
          },
        },
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
              example: {
                status: 'error',
                message: 'Resource not found',
                code: 'NOT_FOUND',
              },
            },
          },
        },
      },
      ValidationErrorResponse: {
        description: 'Validation failed',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ValidationError' },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and profile management endpoints',
    },
    {
      name: 'Video Generation',
      description: 'Video job creation, management, and batch processing',
    },
    {
      name: 'Prompt Management',
      description: 'Prompt enhancement, storyboard generation, and template management',
    },
    {
      name: 'Providers',
      description: 'AI provider information and performance metrics',
    },
    {
      name: 'Admin',
      description: 'Administrative endpoints for user and job management',
    },
    {
      name: 'Analytics',
      description: 'Usage statistics, provider breakdowns, and trend analysis',
    },
    {
      name: 'Billing',
      description: 'Pricing plans, credit management, and subscriptions',
    },
    {
      name: 'Favorites',
      description: 'User favorite video jobs management',
    },
    {
      name: 'System',
      description: 'Health check and system information',
    },
  ],
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user account',
        description: 'Creates a new user account and returns an authentication token.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', minLength: 1, maxLength: 100, example: 'John Doe' },
                  email: { type: 'string', format: 'email', example: 'john@example.com' },
                  password: { type: 'string', format: 'password', minLength: 8, example: 'securePassword123' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'User registered successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          '400': { $ref: '#/components/responses/ValidationErrorResponse' },
          '500': { description: 'Internal server error' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Authenticate user',
        description: 'Authenticates a user with email and password, returns JWT token.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'john@example.com' },
                  password: { type: 'string', format: 'password', example: 'securePassword123' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          '400': { $ref: '#/components/responses/ValidationErrorResponse' },
          '401': { description: 'Invalid email or password' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current user profile',
        description: 'Returns the profile of the currently authenticated user.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'User profile retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: { user: { $ref: '#/components/schemas/User' } },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
      },
      put: {
        tags: ['Authentication'],
        summary: 'Update user profile',
        description: 'Updates the profile of the currently authenticated user.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', maxLength: 100 },
                  email: { type: 'string', format: 'email' },
                  image: { type: 'string', format: 'uri', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Profile updated successfully' },
          '400': { $ref: '#/components/responses/ValidationErrorResponse' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Logout user',
        description: 'Clears the authentication cookie.',
        responses: {
          '200': {
            description: 'Logged out successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    message: { type: 'string', example: 'Logged out successfully' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/video/generate': {
      post: {
        tags: ['Video Generation'],
        summary: 'Generate a video',
        description: 'Creates and queues a new video generation job. Optionally accepts an image upload.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['prompt'],
                properties: {
                  prompt: { type: 'string', minLength: 1, maxLength: 5000, example: 'A majestic dragon flying over misty mountains at sunset' },
                  provider: { type: 'string', description: 'Specific provider to use (auto-selected if omitted)', example: 'runway' },
                  enhancePrompt: { type: 'boolean', description: 'Whether to AI-enhance the prompt' },
                  options: {
                    type: 'object',
                    properties: {
                      duration: { type: 'number', minimum: 1, maximum: 120, description: 'Video duration in seconds' },
                      resolution: { type: 'string', enum: ['720p', '1080p', '4k'] },
                      style: { type: 'string', description: 'Visual style guide' },
                      negativePrompt: { type: 'string', description: 'Elements to avoid' },
                    },
                  },
                },
              },
            },
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['prompt'],
                properties: {
                  prompt: { type: 'string' },
                  provider: { type: 'string' },
                  enhancePrompt: { type: 'string', description: 'true/false' },
                  options: { type: 'string', description: 'JSON string of options' },
                  image: { type: 'string', format: 'binary', description: 'Source image file' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Video generation job created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: { job: { $ref: '#/components/schemas/VideoJob' } },
                    },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationErrorResponse' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/api/video/jobs': {
      get: {
        tags: ['Video Generation'],
        summary: 'List user video jobs',
        description: 'Returns a paginated list of video jobs for the authenticated user.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'] } },
          { name: 'provider', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Jobs retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: { $ref: '#/components/schemas/PaginatedResponse' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/api/video/jobs/{id}': {
      get: {
        tags: ['Video Generation'],
        summary: 'Get video job details',
        description: 'Returns detailed information about a specific video job.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Job details retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: { job: { $ref: '#/components/schemas/VideoJob' } },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
      },
      delete: {
        tags: ['Video Generation'],
        summary: 'Delete a video job',
        description: 'Deletes a video job. Cannot delete jobs that are currently processing.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Job deleted successfully' },
          '400': { description: 'Cannot delete processing job' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/api/video/jobs/{id}/cancel': {
      post: {
        tags: ['Video Generation'],
        summary: 'Cancel a video job',
        description: 'Cancels a pending or processing video job.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Job cancelled successfully' },
          '400': { description: 'Job already completed or cancelled' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/api/video/batch': {
      post: {
        tags: ['Video Generation'],
        summary: 'Batch generate videos',
        description: 'Creates multiple video generation jobs in a single request.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['prompts'],
                properties: {
                  prompts: {
                    type: 'array',
                    items: { type: 'string' },
                    minItems: 1,
                    maxItems: 50,
                    example: ['Prompt 1', 'Prompt 2', 'Prompt 3'],
                  },
                  provider: { type: 'string' },
                  options: {
                    type: 'object',
                    properties: {
                      duration: { type: 'number' },
                      resolution: { type: 'string', enum: ['720p', '1080p', '4k'] },
                      style: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Batch jobs created' },
          '400': { $ref: '#/components/responses/ValidationErrorResponse' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/api/video/stats': {
      get: {
        tags: ['Video Generation'],
        summary: 'Get job statistics',
        description: 'Returns statistics about the user\'s video generation jobs.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Statistics retrieved' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/api/prompt/enhance': {
      post: {
        tags: ['Prompt Management'],
        summary: 'Enhance a prompt',
        description: 'Analyzes and enhances a video generation prompt with style, mood, and keywords.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['prompt'],
                properties: {
                  prompt: { type: 'string', maxLength: 5000, example: 'a dragon flying over mountains' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Prompt enhanced successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        original: { type: 'string' },
                        enhanced: { type: 'string' },
                        keywords: { type: 'array', items: { type: 'string' } },
                        style: { type: 'string', nullable: true },
                        mood: { type: 'string', nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/prompt/storyboard': {
      post: {
        tags: ['Prompt Management'],
        summary: 'Generate storyboard',
        description: 'Creates a multi-scene storyboard from a prompt.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['prompt'],
                properties: {
                  prompt: { type: 'string', maxLength: 5000 },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Storyboard generated' },
        },
      },
    },
    '/api/prompt/templates': {
      get: {
        tags: ['Prompt Management'],
        summary: 'List prompt templates',
        description: 'Returns paginated list of public prompt templates.',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: {
          '200': { description: 'Templates retrieved' },
        },
      },
      post: {
        tags: ['Prompt Management'],
        summary: 'Create prompt template',
        description: 'Creates a new prompt template.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'content'],
                properties: {
                  title: { type: 'string', maxLength: 200 },
                  content: { type: 'string', maxLength: 10000 },
                  category: { type: 'string', maxLength: 100 },
                  isPublic: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Template created' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/api/prompt/templates/{id}': {
      put: {
        tags: ['Prompt Management'],
        summary: 'Update prompt template',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Template updated' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
      },
      delete: {
        tags: ['Prompt Management'],
        summary: 'Delete prompt template',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Template deleted' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/api/providers': {
      get: {
        tags: ['Providers'],
        summary: 'List all providers',
        description: 'Returns all registered AI video providers with their current metrics.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Providers retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        providers: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Provider' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/api/providers/{name}': {
      get: {
        tags: ['Providers'],
        summary: 'Get provider details',
        description: 'Returns detailed information about a specific provider.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'name', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Provider details retrieved' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/api/providers/stats/performance': {
      get: {
        tags: ['Providers'],
        summary: 'Get provider performance stats (Admin)',
        description: 'Returns detailed performance metrics for all providers.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Performance stats retrieved' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '403': { description: 'Admin access required' },
        },
      },
    },
    '/api/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List all users',
        description: 'Returns paginated list of all users (Admin only).',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: {
          '200': { description: 'Users retrieved' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '403': { description: 'Admin access required' },
        },
      },
    },
    '/api/admin/users/{id}': {
      get: {
        tags: ['Admin'],
        summary: 'Get user details',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'User details retrieved' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
      },
      put: {
        tags: ['Admin'],
        summary: 'Update user (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'User updated' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Delete user (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'User deleted' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/api/admin/stats': {
      get: {
        tags: ['Admin'],
        summary: 'Get system statistics',
        description: 'Returns system-wide usage statistics (Admin only).',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'System stats retrieved' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '403': { description: 'Admin access required' },
        },
      },
    },
    '/api/admin/jobs': {
      get: {
        tags: ['Admin'],
        summary: 'List all jobs (Admin)',
        description: 'Returns paginated list of all video jobs across all users.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'] } },
          { name: 'provider', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Jobs retrieved' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '403': { description: 'Admin access required' },
        },
      },
    },
    '/api/admin/jobs/{id}': {
      put: {
        tags: ['Admin'],
        summary: 'Update job (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Job updated' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/api/analytics/usage': {
      get: {
        tags: ['Analytics'],
        summary: 'Get user usage statistics',
        description: 'Returns usage statistics and daily trends for the authenticated user.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'days', in: 'query', schema: { type: 'integer', default: 30, maximum: 365 } },
        ],
        responses: {
          '200': { description: 'Usage statistics retrieved' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/api/analytics/providers': {
      get: {
        tags: ['Analytics'],
        summary: 'Get provider breakdown',
        description: 'Returns provider usage breakdown for the authenticated user.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Provider breakdown retrieved' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/api/analytics/trends': {
      get: {
        tags: ['Analytics'],
        summary: 'Get usage trends',
        description: 'Returns daily usage trends over a specified time period.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'days', in: 'query', schema: { type: 'integer', default: 30, maximum: 365 } },
        ],
        responses: {
          '200': { description: 'Trends retrieved' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/api/billing/plans': {
      get: {
        tags: ['Billing'],
        summary: 'Get pricing plans',
        description: 'Returns all available subscription plans with pricing and features.',
        responses: {
          '200': {
            description: 'Plans retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        plans: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/BillingPlan' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/billing/credits': {
      get: {
        tags: ['Billing'],
        summary: 'Get user credits',
        description: 'Returns the current credit balance and usage for the authenticated user.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Credit info retrieved' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
      post: {
        tags: ['Billing'],
        summary: 'Purchase credits',
        description: 'Purchases additional credits for the authenticated user.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount'],
                properties: {
                  amount: { type: 'integer', minimum: 1, maximum: 100000 },
                  paymentMethod: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Credits purchased' },
          '400': { $ref: '#/components/responses/ValidationErrorResponse' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/api/billing/subscribe': {
      post: {
        tags: ['Billing'],
        summary: 'Subscribe to plan',
        description: 'Subscribes the authenticated user to a pricing plan.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['planId'],
                properties: {
                  planId: { type: 'string', enum: ['free', 'pro', 'enterprise'] },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Subscription successful' },
          '400': { description: 'Invalid plan' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/api/favorites': {
      get: {
        tags: ['Favorites'],
        summary: 'List favorite jobs',
        description: 'Returns all favorited video jobs for the authenticated user.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Favorites retrieved' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
      post: {
        tags: ['Favorites'],
        summary: 'Add favorite',
        description: 'Adds a video job to the user\'s favorites.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['videoJobId'],
                properties: {
                  videoJobId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Favorite added' },
          '400': { description: 'Already in favorites' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/api/favorites/{jobId}': {
      delete: {
        tags: ['Favorites'],
        summary: 'Remove favorite',
        description: 'Removes a video job from the user\'s favorites.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'jobId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Favorite removed' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        description: 'Basic health check endpoint to verify the API is running.',
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        service: { type: 'string', example: 'NextGen Flow Pro' },
                        version: { type: 'string', example: '1.0.0' },
                        timestamp: { type: 'string', format: 'date-time' },
                        uptime: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export const swaggerSpec = swaggerJsdoc({
  definition: swaggerDefinition,
  apis: [],
});

export default swaggerDefinition;
