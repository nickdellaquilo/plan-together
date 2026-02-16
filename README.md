# Plan Together

A social coordination platform for planning hangouts with friends.

## Quick Start

### Prerequisites

- Node.js 16+ and npm 8+
- Docker Desktop (for local database)

### Setup
```bash
# Install dependencies
npm install

# Start database with Docker
npm run docker:up

# Run database migrations
npm run db:migrate

# Start development servers
npm run dev
```

Visit http://localhost:3000 to see the app!

## Available Commands

**Development:**
- `npm run dev` - Start all apps
- `npm run build` - Build for production

**Database:**
- `npm run db:migrate` - Run migrations
- `npm run db:migrate:create <name>` - Create new migration

**Docker:**
- `npm run docker:up` - Start PostgreSQL and Redis
- `npm run docker:down` - Stop services
- `npm run docker:logs` - View logs

## Project Structure
```
plan-together/
├── apps/
│   ├── api/          # Backend API (coming soon)
│   └── web/          # React frontend (coming soon)
├── packages/
│   ├── database/     # Database migrations & utilities
│   └── types/        # Shared TypeScript types
└── docker-compose.yml # Local dev environment
```

## Tech Stack

- **Frontend:** React, React Router, Axios
- **Backend:** Node.js, Express, PostgreSQL
- **Tools:** Turbo (monorepo), Docker (local dev)