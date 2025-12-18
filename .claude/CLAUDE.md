# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Next.js 16 + React 19 application showcasing Kibo UI components (Gantt chart, Kanban board, Calendar, List, Table) built on top of shadcn/ui with Tailwind CSS v4.

## Commands

```bash
bun dev              # Start dev server (turbopack)
bun run build        # Production build
bun run lint         # Check for issues (biome check)
bun run format       # Format code (biome format --write)
bun x ultracite fix  # Auto-fix lint + format issues (run before commits)
```

Pre-commit hooks (lefthook) automatically run `ultracite fix` on staged files.

## Database Setup

PostgreSQL via Docker with Drizzle ORM.

```bash
docker-compose up -d           # Start PostgreSQL container
bun run db:generate            # Generate migrations from schema
bun run db:migrate             # Apply migrations
bun run db:push                # Push schema directly (dev)
bun run db:seed                # Seed database with sample data
bun run db:studio              # Open Drizzle Studio
bun run db:clean               # Reset database (destroys data)
```

Requires `DATABASE_URL` environment variable (e.g., `postgresql://shadcn:shadcn_password@localhost:5432/roadmap`).

## Architecture

### Directory Structure

- `app/` - Next.js App Router pages (gantt, kanban, calendar, list, table, roadmap demos)
- `components/kibo-ui/` - Complex UI components from kibo-ui.com registry
- `components/ui/` - Base shadcn/ui primitives (button, dialog, etc.)
- `lib/db/` - Drizzle ORM schema, relations, queries, and database client
- `lib/utils.ts` - Shared utilities (cn function for class merging)

### Kibo UI Components

Located in `components/kibo-ui/`, these are feature-rich components:

- **gantt/** - Gantt chart with timeline, dependencies, drag-to-reschedule, auto-scheduling
  - Uses Jotai for state (scroll position, dragging state, feature positions)
  - Subcomponents: Provider, Sidebar, Timeline, FeatureItem, DependencyLayer, Markers
  - Utilities in `utils/` for timeline calculations and auto-scheduling
- **kanban/** - Drag-and-drop board using @dnd-kit
- **calendar/** - Calendar view
- **table/** - Data table with @tanstack/react-table
- **list/** - List view

### Component Import Aliases

```typescript
@/components    // components/
@/components/ui // components/ui/
@/lib           // lib/
```

### Key Dependencies

- **@dnd-kit** - Drag and drop (kanban, gantt)
- **@tanstack/react-table** - Table component
- **jotai** - Atomic state management (gantt)
- **date-fns** - Date utilities
- **drizzle-orm** - Database ORM with type-safe queries
- **@tabler/icons-react** - Icon library (configured in components.json)

## Code Standards

Uses **Ultracite** (Biome preset) for linting/formatting. Key rules:

- No barrel files (except gantt/index.tsx which has an override)
- Prefer `for...of` over `.forEach()`
- Use `const` by default, arrow functions for callbacks
- React 19: Use ref as prop (no forwardRef needed)
- Next.js: Use `<Image>` component, Server Components for data fetching
