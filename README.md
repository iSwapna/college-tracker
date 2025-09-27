# College Application Tracker

A SvelteKit-based application that helps students manage their college applications, deadlines, and tasks. The application uses Prisma ORM with PostgreSQL for data management and Tailwind CSS for styling.

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   # Copy .env.example to .env and configure
   PRISMA_DATABASE_URL="your-postgresql-connection-string"
   ```

4. Set up the database:
   ```bash
   npm run db:push     # Push schema to database
   npm run db:seed     # Seed with initial data
   ```

5. Start the development server:
   ```bash
   npm run dev         # Start on default port
   npm run dev -- --port 4000  # Start on specific port
   ```

## Usage

**Add Schools:** School name + deadline → Click "Add School"

**Manage Tasks:** First-time editing offers two options:
- **Use Template**: 5 standard tasks (Essay Draft, Essay Final, Tests & Transcripts, Recommendations, Rest of Form)
- **Start from Scratch**: Manual task creation

**Task Features:**
- Inline editing (click any field)
- Decimal time support (2.5h)
- Sortable columns
- Progress tracking
- Sequential order validation

## Development Commands

**Development:**
```bash
npm run dev              # Start development server
npm run dev -- --open   # Start dev server and open browser
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

### Tech Stack
- **Frontend**: SvelteKit 2.x with Svelte 5.x
- **Styling**: Tailwind CSS v4
- **Database**: PostgreSQL with Prisma ORM
- **Deployment**: Vercel with Vercel Postgres

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and type checking
5. Submit a pull request

## License

This project is licensed under the MIT License.