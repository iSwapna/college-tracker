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

### Database Schema
The application centers around 4 main models:
- **User**: Basic user information and authentication
- **Application**: College applications linked to users with school name and deadline
- **Task**: Individual tasks within applications (essays, forms, etc.)
- **TaskType**: Predefined task categories with default time estimates

### Key Relationships
- Users have many Applications
- Applications have many Tasks
- Tasks belong to TaskTypes for standardization

### SvelteKit Structure
- `/src/routes/+page.svelte`: Landing page
- `/src/routes/(app)/school/+page.svelte`: Main application management page
- `/src/lib/prisma.ts`: Database client and helper functions
- `/src/lib/components/SchoolPage.svelte`: Main application component
- `/src/lib/Header.svelte`: Navigation header

### Database Helpers
The `src/lib/prisma.ts` file contains essential helper functions:
- `getUserApplicationsWithProgress()`: Fetch user applications with tasks
- `calculateUserTimeNeeded()`: Calculate workload and time estimates
- `calculateWeeklyPlan()`: Calculate weekly work distribution and progress metrics
- `getApplicationWithTasks()`: Get single application with full details
- `updateTaskStatus()`: Update task completion status
- `createApplication()`: Create new application with tasks
- `deleteApplication()`: Delete application and cascade to tasks

### Environment Requirements
- `PRISMA_DATABASE_URL`: PostgreSQL connection string
- The app uses Vercel Postgres (@vercel/postgres) for deployment

## Development Notes

- Uses SvelteKit 2.x with Svelte 5.x
- Styled with Tailwind CSS v4
- Database operations should use the helper functions in `prisma.ts`
- All database models use `cuid()` for IDs
- Tasks support flexible ordering via `globalOrder` field
- Time estimates are stored as Float (supports decimals like 2.5)
- Applications store school names directly (no separate Program model)
- Template system available for quick task setup
- Inline editing with bulk save functionality

## Testing

The project includes comprehensive integration tests covering the main application workflow:

### Test Structure
- **Framework**: Vitest with PostgreSQL database
- **Location**: `tests/integration/`
- **Setup**: `tests/setup.ts` handles database initialization and cleanup

### Test Coverage (23 tests)

**Application Workflow Tests** (`application-workflow.test.ts`):
- Creating applications with tasks
- Retrieving applications with progress
- Deleting applications (cascade deletion)
- Adding new tasks to partially completed applications

**Time Calculations Tests** (`time-calculations.test.ts`):
- Total time calculation for pending tasks
- Excluding completed tasks from calculations
- Handling multiple applications with different deadlines
- Work time with 10% buffer calculation
- Remaining task counts
- Weekly work distribution
- Essay hours tracking (completed/total/percentage)
- Essay task count percentage
- Notification task tracking and completion

**Task Status Management Tests** (`task-status.test.ts`):
- Marking tasks as completed (with timestamp)
- Reverting tasks from completed to pending
- Time calculation updates based on status changes
- Complex scenarios with multiple status changes
- Status changes across multiple applications

### Running Tests
Tests use the existing PostgreSQL database and clean up after themselves. Run sequentially to avoid conflicts:
```bash
npm test -- --pool=forks --poolOptions.forks.singleFork=true
```

## Recent Changes
- Before starting, understand current codebase well and how each component interacts with others. Make sure the new code follows the same pattern and is modular. Ask any clarifying questions, if any, before proceeding to change code. Keep the changes as much as possible, in testable chunks