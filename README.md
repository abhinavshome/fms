# FMS

A pnpm workspace with a React UI, Express API, and PostgreSQL database. The API uses `pg-promise` so SQL stays visible and explicit.

## Requirements

- Node.js 20+
- pnpm 10+
- Docker Desktop (for PostgreSQL)

## Run locally

```bash
pnpm install
docker compose up -d
cp .env.example .env
pnpm migrate:up
pnpm dev
```

Open `http://localhost:5173` for the UI. The API runs at `http://localhost:3001`.

## Migrations

Migration files live in `apps/api/migrations` and contain `-- up` and `-- down` sections.

```bash
pnpm migrate:status
pnpm migrate:up
pnpm migrate:down
```

`migrate:down` rolls back the most recently applied migration. Each migration runs in a database transaction.

To add or refresh a local sample account after migrating:

```bash
pnpm user:seed
```

The defaults are `sample@example.com` / `password123`. Override them with `SAMPLE_USER_NAME`, `SAMPLE_USER_EMAIL`, and `SAMPLE_USER_PASSWORD` in `.env`.

## Authentication

The API uses email/password authentication with `bcryptjs` password hashes and seven-day JWTs in an `HttpOnly` cookie named `fms_auth`. Run `pnpm migrate:up` to add the `users.password_hash` column. Set a long random `JWT_SECRET` in `.env` before using login outside local development.

- `POST /api/users/login` with `{ "email": "...", "password": "..." }`
- `GET /api/users/me` to restore the current session
- `POST /api/users/logout` to clear the authentication cookie

## Structure

- `apps/api`: Express API, raw SQL access, and migration runner
- `apps/ui`: Vite + React client
- `docs/database-design.md`: database entities, relationships, and workflow decisions
- `docker-compose.yml`: local PostgreSQL
