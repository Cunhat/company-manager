# company-manager

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React, TanStack Start, Self, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Start** - SSR framework with TanStack Router
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - UI primitives live in `apps/web`
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better-Auth
- **Oxlint** - Oxlint + Oxfmt (linting & formatting)
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
bun install
```

## Database Setup

Add your Postgres connection string to `apps/web/.env`:

```bash
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

Alchemy reads that value and passes it to the app. For Neon, use the pooled connection string from the console.

Generate and commit migration SQL with `bun run db:generate`, then apply it with `bun run db:migrate`.

For an existing database with the old `kms_path.date` column, run
[`packages/db/sql/20260909_kms_journeys.sql`](packages/db/sql/20260909_kms_journeys.sql)
before using the journey endpoints. This standalone upgrade preserves path timestamps
as `created_at` and creates the `journey` table. It is separate from the Drizzle
migration journal, which has no committed baseline yet. Mileage now reads and writes
journeys in the database; previous browser-only drafts are not imported.

Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the fullstack application.

## UI Customization

### Monthly mileage PDF

In Mileage, select a month and choose **Descarregar PDF**. Confirm the company name
and download the Portuguese A4 landscape report. The report uses the last day of
the selected month and includes each saved journey, its purpose and notes,
kilometres, reimbursement at €0.40/km, monthly totals, and space for a signature.
Long reports repeat the table headings and include page numbers. Employee and
vehicle details are not included yet. PDF generation runs in the browser.

shadcn/ui lives in the web app.

- Change design tokens and global styles in `apps/web/src/index.css`
- Update primitives in `apps/web/src/components/ui/*`
- Adjust shadcn aliases or style config in `apps/web/components.json`

Add more components from `apps/web`:

```bash
bunx --bun shadcn@latest add accordion dialog popover sheet table
```

Import components like this:

```tsx
import { Button } from "@/components/ui/button";
```

## Deployment

### Alchemy

- Target: web on Cloudflare
- Configure Cloudflare login: `cd packages/infra && bunx alchemy login --configure`
- Dev: bun run dev
- Deploy: bun run deploy
- Destroy: bun run destroy

`alchemy login --configure` stores the selected Cloudflare provider profile under `~/.alchemy`. The database is not provisioned by Alchemy; set `DATABASE_URL` in `apps/web/.env`.

Deploys are staged and default to a personal `dev_<username>` stage. For production, run the deploy with an explicit stage from `packages/infra`:

```bash
cd packages/infra && bunx alchemy deploy --stage production
```

## Git Hooks and Formatting

- Run checks: `bun run check`

## Project Structure

```
company-manager/
├── apps/
│   └── web/         # Fullstack application (React + TanStack Start)
├── packages/
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run dev:web`: Start only the web application
- `bun run check-types`: Check TypeScript types across all apps
- `bun run db:push`: Push schema changes to database
- `bun run db:generate`: Generate database client/types
- `bun run db:migrate`: Run database migrations
- `bun run db:studio`: Open database studio UI
- `bun run check`: Run Oxlint and Oxfmt
