# Kibo UI Component Showcase

A Next.js 16 + React 19 application showcasing [Kibo UI](https://kibo-ui.com) components built on top of shadcn/ui with Tailwind CSS v4.

The original Kibo UI components have been hugely enhanced with additional features including database persistence, drag-to-reschedule, auto-scheduling, and dependency management for the Gantt chart.

Special thanks to [Hayden Bleasel](https://github.com/haydenbleasel) for creating the excellent Kibo UI component library.

## Features

- **Gantt Chart** - Timeline view with dependencies, drag-to-reschedule, and auto-scheduling
- **Kanban Board** - Drag-and-drop task board
- **Calendar** - Calendar view for scheduling
- **Table** - Data table with sorting and filtering
- **List** - List view for features
- **Roadmap** - Product roadmap visualization

## Tech Stack

- [Next.js 16](https://nextjs.org) with App Router and Turbopack
- [React 19](https://react.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com) + [Kibo UI](https://kibo-ui.com)
- [Drizzle ORM](https://orm.drizzle.team) with PostgreSQL
- [Biome](https://biomejs.dev) via [Ultracite](https://github.com/haydenbleasel/ultracite)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) runtime
- [Docker](https://docker.com) (for PostgreSQL)

### Installation

```bash
bun install
```

### Database Setup

```bash
# Start PostgreSQL
docker-compose up -d

# Create .env.local with database URL
echo "DATABASE_URL=postgresql://shadcn:shadcn_password@localhost:5432/roadmap" > .env.local

# Push schema and seed data
bun run db:push
bun run db:seed
```

### Development

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start dev server with Turbopack |
| `bun run build` | Production build |
| `bun run lint` | Check for issues |
| `bun run format` | Format code |
| `bun run db:push` | Push schema to database |
| `bun run db:seed` | Seed database |
| `bun run db:studio` | Open Drizzle Studio |
| `bun run db:clean` | Reset database |

## Project Structure

```
app/                    # Next.js App Router pages
components/
  kibo-ui/              # Feature-rich Kibo UI components
  ui/                   # Base shadcn/ui primitives
lib/
  db/                   # Drizzle ORM schema and queries
  utils.ts              # Shared utilities
```
