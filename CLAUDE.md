# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a SvelteKit-based college application tracker that helps users manage their college applications, deadlines, and tasks. The application uses Prisma ORM with PostgreSQL for data management and Tailwind CSS for styling.

## Key Commands

**Development:**
```bash
npm run dev              # Start development server
npm run dev -- --open   # Start dev server and open browser
npm run dev -- --port 4000  # Start dev server on specific port
```

**Build & Deploy:**
```bash
npm run build           # Build for production
npm run preview         # Preview production build
```

**Type Checking:**
```bash
npm run check           # Run svelte-check
npm run check:watch     # Run svelte-check in watch mode
```

**Database Operations:**
```bash
npm run db:generate     # Generate Prisma client
npm run db:push         # Push schema to database
npm run db:seed         # Seed database with initial data
```

**Testing:**
```bash
npm test                # Run all integration tests
npm run test:watch      # Run tests in watch mode
npm run test:ui         # Open Vitest UI
```

## Architecture

### Authentication
The application uses **Kinde Auth** for authentication via `@kinde-oss/kinde-auth-sveltekit`:

**Auth Flow:**
- Authentication handled in `src/hooks.server.ts` with session hooks
- API endpoint at `/api/auth/[...kindeAuth]/+server.ts` handles all auth routes
- Protected routes redirect unauthenticated users to `/api/auth/login`
- User sync: Kinde users are automatically synced to local database on first login
- User data stored in `event.locals.user` for server-side access
- Cache headers prevent caching of authenticated pages

**Protected Routes:**
- `/` (home page)
- `/school` (application management)
- `/plan` (weekly planning)
- All routes under `(app)` group

**Route Guards:**
- `src/hooks.server.ts`: Global authentication check and user sync (lines 5-73)
- `src/routes/(app)/+layout.server.ts`: Layout-level auth enforcement (lines 4-14)

**Environment Variables Required:**
```bash
KINDE_CLIENT_ID=your_kinde_client_id
KINDE_CLIENT_SECRET=your_kinde_client_secret
KINDE_ISSUER_URL=https://your-domain.kinde.com
KINDE_SITE_URL=http://localhost:5173  # or production URL
KINDE_POST_LOGOUT_REDIRECT_URL=http://localhost:5173
KINDE_POST_LOGIN_REDIRECT_URL=http://localhost:5173/school
```

### Database Schema
The application centers around 4 main models (see `prisma/schema.prisma`):

- **User**: User information synced from Kinde
  - `kindeId` (unique): Kinde user identifier
  - `email` (unique): User email
  - `username` (unique): User username
  - `name`: Optional display name
  - Cascade deletion: Deleting a user deletes all applications

- **Application**: College applications linked to users
  - `schoolName`: Name of the college/university
  - `deadline`: Application deadline date
  - `url`: Optional application portal URL
  - `status`: not_started, in_progress, completed
  - Cascade deletion: Deleting an application deletes all tasks

- **Task**: Individual tasks within applications
  - `title`: Task name (must be unique within application)
  - `description`: Optional task details
  - `status`: pending, completed, overdue
  - `timeEstimate`: Hours needed (Float, supports decimals)
  - `order`: Optional ordering within application (1-indexed sequence)
  - `globalOrder`: Flexible ordering across all applications
  - `url`: Task-specific URL (defaults to application URL)
  - `completedAt`: Timestamp when marked complete
  - Cascade deletion: Deleting task type is restricted if tasks exist

- **TaskType**: Predefined task categories
  - `type`: essay-draft, essay-final, timebox, notification
  - `defaultTime`: Default hours (2, 1, 2, null respectively)

### Key Relationships
- Users have many Applications (cascade delete)
- Applications have many Tasks (cascade delete)
- Tasks belong to TaskTypes (restrict delete)
- Tasks belong to Applications (cascade delete)

### SvelteKit Route Structure

**Public Routes:**
- `/src/routes/+page.svelte`: Landing page (redirects to login if not authenticated)
- `/src/routes/login/+page.svelte`: Login page (redirects to /school if authenticated)

**Protected Routes (app group):**
- `/src/routes/(app)/school/+page.svelte`: Main application management
  - Actions: `addSchool`, `deleteSchool`
  - Server: `/src/routes/(app)/school/+page.server.ts`

- `/src/routes/(app)/plan/[applicationId]/+page.svelte`: Single application task management
  - Actions: `addTask`, `deleteTask`, `updateTask`, `updateTasks`, `applyTemplate`
  - Server: `/src/routes/(app)/plan/[applicationId]/+page.server.ts`

- `/src/routes/(app)/+layout.server.ts`: Layout that enforces authentication and passes user data

**API Routes:**
- `/src/routes/api/auth/[...kindeAuth]/+server.ts`: Kinde auth handler (login, logout, callback)

**Key Components:**
- `/src/lib/components/SchoolPage.svelte`: Main application management component
- `/src/lib/Header.svelte`: Navigation header with auth status
- `/src/lib/prisma.ts`: Database client and helper functions

### Database Helpers
The `src/lib/prisma.ts` file contains essential helper functions:
- `getUserApplicationsWithProgress(userId)`: Fetch user applications with tasks and progress
- `calculateUserTimeNeeded(userId)`: Calculate workload and time estimates
- `calculateWeeklyPlan(userId)`: Calculate weekly work distribution and progress metrics
- `getApplicationWithTasks(applicationId, userId)`: Get single application with full details (user-scoped)
- `updateTaskStatus(taskId, status)`: Update task completion status with timestamp
- `createApplication(data)`: Create new application with optional tasks
- `deleteApplication(applicationId, userId)`: Delete application and cascade to tasks (user-scoped)

**Security Notes:**
- All database helpers that accept `userId` enforce user data isolation
- `getApplicationWithTasks()` and `deleteApplication()` verify user ownership
- Frontend should never trust user IDs from client; always use `locals.user.id` from server

### Environment Variables

**Required for Development:**
```bash
# Database (Prisma)
PRISMA_DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=your_api_key"
DATABASE_URL="postgres://user:pass@host:5432/database?sslmode=require"
POSTGRES_URL="postgres://user:pass@host:5432/database?sslmode=require"

# Kinde Auth
KINDE_CLIENT_ID=your_kinde_client_id
KINDE_CLIENT_SECRET=your_kinde_client_secret
KINDE_ISSUER_URL=https://your-domain.kinde.com
KINDE_SITE_URL=http://localhost:5173
KINDE_POST_LOGOUT_REDIRECT_URL=http://localhost:5173
KINDE_POST_LOGIN_REDIRECT_URL=http://localhost:5173/school
```

**Production (Vercel):**
- All above variables configured in Vercel project settings
- `KINDE_SITE_URL` should be production domain
- Node.js version: 20.x (configured in `package.json` engines)
- Adapter: `@sveltejs/adapter-vercel` with Node.js 22.x runtime

## Development Notes

### Tech Stack
- **Framework**: SvelteKit 2.x with Svelte 5.x
- **Styling**: Tailwind CSS v4 with official plugins (@tailwindcss/forms, @tailwindcss/typography)
- **Database**: PostgreSQL with Prisma ORM (v6.16.2)
- **Authentication**: Kinde Auth (@kinde-oss/kinde-auth-sveltekit v2.2.3)
- **Deployment**: Vercel with adapter-vercel (Node.js 22.x runtime)
- **Testing**: Vitest v3.2.4 with PostgreSQL integration tests

### Development Guidelines
- Database operations should always use helper functions in `prisma.ts`
- Never bypass user isolation checks - always pass and verify `userId`
- All database models use `cuid()` for IDs
- Tasks support flexible ordering via `globalOrder` field (auto-incremented)
- Time estimates are stored as Float (supports decimals like 2.5 hours)
- Applications store school names directly (no separate Program model)
- Template system available for quick task setup (5 predefined tasks)
- Inline editing with bulk save functionality and validation
- Form actions validate duplicate names, past deadlines, and user ownership

### Key Features
1. **Task Template System**: Apply template to create 5 standard tasks per application
2. **Flexible Task Ordering**:
   - `order`: Optional 1-indexed sequence within an application
   - `globalOrder`: Auto-incremented ordering across all applications
3. **Time Tracking**:
   - Calculates total hours needed with 10% buffer
   - Tracks essay hours separately (draft + final)
   - Excludes notification tasks from time estimates
4. **Weekly Planning**: Distributes work across weeks until earliest deadline
5. **Progress Tracking**:
   - Essay completion percentage (hours and task count)
   - Notification task tracking
   - Overall application progress
6. **Validation**:
   - Duplicate school names within user's applications
   - Duplicate task names within same application
   - Task order must be 1-indexed sequence
   - Deadlines cannot be in the past

## Testing

The project includes comprehensive integration tests using **Vitest** with a real PostgreSQL database.

### Test Configuration
- **Framework**: Vitest v3.2.4 with Node environment
- **Config**: `vitest.config.ts` sets up path aliases and test environment
- **Setup**: `tests/setup.ts` handles database lifecycle
- **Location**: `tests/integration/`
- **Database**: Uses existing PostgreSQL database (configured via `PRISMA_DATABASE_URL`)
- **Isolation**: Each test resets database state via `resetDatabase()`

### Test Setup Functions (`tests/setup.ts`)
- `setupTestDatabase()`: Connects to PostgreSQL and seeds task types
- `cleanupTestDatabase()`: Disconnects from database
- `resetDatabase()`: Deletes all users, applications, and tasks; re-seeds task types
- `createTestUser(email, name, kindeId?)`: Helper to create test users with required fields
- `getTestPrisma()`: Returns Prisma client for direct database access

### Test Coverage (27 tests across 4 suites)

**1. Application Workflow Tests** (`application-workflow.test.ts`) - 4 tests
- Creating applications with tasks
- Retrieving applications with task progress
- Deleting applications with cascade deletion to tasks
- Adding new tasks to partially completed applications

**2. Time Calculations Tests** (`time-calculations.test.ts`) - 9 tests
- Total time calculation for pending tasks only
- Excluding completed tasks from time calculations
- Multiple applications with different deadlines
- Work time with 10% buffer calculation
- Remaining task counts (excluding completed)
- Weekly work distribution across deadlines
- Essay hours tracking (completed/total/percentage)
- Essay task count percentage
- Notification task tracking and completion status

**3. Task Status Management Tests** (`task-status.test.ts`) - 10 tests
- Marking tasks as completed (sets `completedAt` timestamp)
- Reverting tasks from completed to pending (clears `completedAt`)
- Time calculation updates based on status changes
- Complex scenarios with multiple status transitions
- Status changes across multiple applications
- Ensuring calculations exclude completed tasks

**4. User Data Isolation Tests** (`user-isolation.test.ts`) - 4 tests
- Isolating applications between different users
- Preventing users from accessing other users' applications
- Preventing users from deleting other users' applications
- Handling multiple applications per user correctly

### Running Tests

**Standard Run (sequential, recommended):**
```bash
npm test
# or explicitly:
npm test -- --pool=forks --poolOptions.forks.singleFork=true
```

**Watch Mode:**
```bash
npm run test:watch
```

**UI Mode:**
```bash
npm run test:ui
```

### Test Database Notes
- Tests use the same PostgreSQL database as development
- Each test suite has `beforeEach` hook that calls `resetDatabase()`
- Task types are seeded before each test run
- Tests must run sequentially (single fork) to avoid race conditions
- All test data is cleaned up automatically after each test

## Server Actions Reference

### School Page Actions (`/school`)

**`addSchool`** - Create new application
- Params: `schoolName`, `deadline`, `url` (optional)
- Validation: No duplicate school names, deadline not in past
- Returns: Application object on success

**`deleteSchool`** - Delete application
- Params: `applicationId`
- Security: Verifies user ownership before deletion
- Effect: Cascades to delete all associated tasks

### Plan Page Actions (`/plan/[applicationId]`)

**`addTask`** - Create new task for application
- Params: `title`, `description`, `timeEstimate`, `taskTypeId`, `order` (optional)
- Validation: No duplicate task titles within application
- Effect: Auto-assigns next `globalOrder`; inherits URL from application

**`deleteTask`** - Delete single task
- Params: `taskId`

**`updateTask`** - Update single task
- Params: `taskId`, `status`, `timeEstimate`, `order` (all optional)
- Effect: Sets `completedAt` when status changes to "completed"

**`updateTasks`** - Bulk update multiple tasks
- Params: `tasks` (JSON object mapping taskId to updated fields)
- Validation: No duplicate titles, orders must be 1-indexed sequence
- Effect: Performs transaction for all updates

**`applyTemplate`** - Create standard tasks for application
- Params: None (uses `applicationId` from route)
- Validation: Only works if application has zero tasks
- Effect: Creates 5 tasks (Essay Draft, Essay Final, Tests & Transcripts, Recommendations, Rest of Form)

### Home Page Actions (`/`)

**`completeTask`** - Mark task as completed
- Params: `taskId`
- Effect: Updates status to "completed" and sets `completedAt`

**`uncompleteTask`** - Mark task as pending
- Params: `taskId`
- Effect: Updates status to "pending" and clears `completedAt`

## Development Workflow

### Initial Setup
1. Clone repository
2. Copy `.env.example` to `.env` and configure all variables
3. Run `npm install`
4. Run `npm run db:generate` to generate Prisma client
5. Run `npm run db:push` to sync schema to database
6. Run `npm run db:seed` to seed task types
7. Configure Kinde application (see Kinde setup below)
8. Run `npm run dev` to start development server

### Kinde Auth Setup
1. Create account at [kinde.com](https://kinde.com)
2. Create new application in Kinde dashboard
3. Configure callback URLs:
   - Allowed callback URLs: `http://localhost:5173/api/auth/kinde_callback`
   - Allowed logout redirect URLs: `http://localhost:5173`
4. Copy credentials to `.env`:
   - Client ID → `KINDE_CLIENT_ID`
   - Client Secret → `KINDE_CLIENT_SECRET`
   - Domain → `KINDE_ISSUER_URL` (format: `https://your-domain.kinde.com`)

### Database Schema Changes
1. Modify `prisma/schema.prisma`
2. Run `npm run db:push` to sync changes
3. Run `npm run db:generate` to regenerate Prisma client
4. Update TypeScript types if needed
5. Update tests to match new schema
6. Run `npm test` to verify tests pass

### Adding New Features
1. Understand current codebase and how components interact
2. Ensure new code follows existing patterns and is modular
3. Ask clarifying questions before making changes
4. Keep changes in testable chunks
5. Write integration tests for new features
6. Update this documentation with new features/APIs

## Common Issues

**Authentication loop / redirect issues:**
- Verify all Kinde environment variables are set correctly
- Check callback URLs in Kinde dashboard match your local/production URLs
- Clear browser cookies and try again

**Database connection errors:**
- Verify `PRISMA_DATABASE_URL` and `DATABASE_URL` are correct
- Check PostgreSQL is running and accessible
- Run `npm run db:push` to ensure schema is synced

**Tests failing:**
- Ensure database is clean: manually run `resetDatabase()` if needed
- Run tests sequentially: `npm test` (not in parallel)
- Check task types are seeded: verify `task_types` table has 4 rows

**Build errors:**
- Run `npm run check` to verify TypeScript types
- Ensure Prisma client is generated: `npm run db:generate`
- Clear `.svelte-kit` folder and rebuild