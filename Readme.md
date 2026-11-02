# Sieve

> Privacy-first inbox intelligence for a cleaner, more focused digital life.

Sieve connects to your Gmail, finds out who actually fills your inbox, and helps you get rid of the senders you don't want, in one click where the sender allows it. It reads email headers only, never the messages themselves.

## Features

- **Sender breakdown.** Every sender from the last year, with how much they send, when they last wrote, and a 0-100 clutter score that weighs volume, recency and newsletter signals.
- **One-click unsubscribe.** Senders that support RFC 8058 are unsubscribed straight from the dashboard. For the rest, Sieve opens their unsubscribe link or email.
- **Keep, ignore, bulk actions.** Mark senders you want to keep, hide the ones you don't care about, or act on a whole page at once.
- **Insights.** Top senders and domains, and how much mail you've stopped by unsubscribing.
- **Fast resyncs.** The first sync scans a year of mail. After that Sieve reads Gmail's change history and only fetches what's new, so a resync takes seconds.
- **Your data, your call.** Delete everything from the Account page, which also revokes Sieve's Gmail access. Light and dark themes.

## How it handles your mail

- Sieve asks for the `gmail.metadata` scope, which can't read message bodies or attachments, and requests only the `From`, `Date`, `List-Unsubscribe` and `List-Unsubscribe-Post` headers.
- It stores one summary row per sender, never individual messages, ids or subjects.
- The Google refresh token is encrypted with AES-256-GCM. Sessions are random tokens stored as SHA-256 hashes.
- Unsubscribe requests only go to public HTTPS addresses, so a crafted header can't make the server call internal hosts.

The full write-up is on the app's [privacy page](client/src/pages/Privacy.tsx).

## Tech stack

| Part     | Tools                                                          |
| -------- | -------------------------------------------------------------- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, React Router       |
| Backend  | Node 24, Express 5, TypeScript, zod                            |
| Database | PostgreSQL (Neon), Prisma 7                                    |
| Google   | OAuth 2.0 with PKCE, Gmail API (metadata scope), plain `fetch` |
| Testing  | Vitest, supertest                                              |
| Tooling  | npm workspaces, Prettier, GitHub Actions, Render               |

## How it works

```
client (React)  ──/api──▶  server (Express)  ──▶  Postgres (Neon)
                                 │
                                 ├──▶ Google OAuth   (sign-in, token refresh)
                                 └──▶ Gmail API      (list, metadata, history)
```

- **Sync** runs in the server process through a small job queue (two at a time, one per user). It pages through the last 12 months of mail newest first, folds the headers into per-sender totals, and saves them as it goes on a first sync. A token-bucket limiter and quota-window backoff keep it inside Gmail's per-user limit.
- **Catch-up syncs** start from the Gmail history id saved by the last sync and add only new mail to the saved totals. A full scan runs again once a week, or when Gmail no longer has the history.
- **Security**: strict CSP and helmet headers, rate limits per IP and per user, small JSON body limits, input validation with zod, and every query scoped to the signed-in user.

## Running it locally

### You'll need

- Node 24 and npm
- A Postgres database. A free [Neon](https://neon.tech) project works.
- A Google Cloud project for sign-in

### 1. Google Cloud

1. Create a project and enable the **Gmail API**.
2. Set up the **OAuth consent screen**: External, Testing mode, with the scopes `openid`, `email`, `profile` and `.../auth/gmail.metadata`.
3. Add your Gmail address under **Test users**. Only test users can sign in while the app is in Testing mode.
4. Create an **OAuth client** of type Web application with the redirect URI `http://localhost:4000/auth/google/callback`.

### 2. Install and configure

```bash
npm install
cp server/.env.example server/.env
```

Fill in `server/.env`:

- `DATABASE_URL`: your Postgres connection string
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: from the OAuth client
- `TOKEN_ENCRYPTION_KEY`: 64 hex characters, from
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

The defaults cover the rest.

### 3. Database

```bash
npm run db:migrate -w server
```

### 4. Run

In two terminals:

```bash
npm run dev:server
npm run dev:client
```

Open http://localhost:5173, connect Gmail and run a sync. A year of mail takes a while the first time (Gmail allows about 300 reads a minute per user), but senders show up within seconds and later syncs are quick.

## Scripts

| Command                        | What it does                               |
| ------------------------------ | ------------------------------------------ |
| `npm run dev:server`           | API with reload on change, port 4000       |
| `npm run dev:client`           | Vite dev server, port 5173, proxies `/api` |
| `npm test`                     | Server test suite                          |
| `npm run typecheck -w server`  | Type-check the server and tests            |
| `npm run build`                | Build the server and the client            |
| `npm run db:migrate -w server` | Create and apply migrations in development |
| `npm run db:deploy -w server`  | Apply migrations in production             |
| `npm run format`               | Format everything with Prettier            |

## Project structure

```
client/src
  components/   UI pieces: sender table, sync panel, filters, theme toggle
  hooks/        data hooks: useSync, useSenders, useTheme
  lib/          api client, types, formatting
  pages/        dashboard, insights, account, privacy
server/src
  config/       env and google settings
  lib/          db client, header parsing, clutter score, crypto, url checks
  middleware/   auth, rate limits, errors
  routes/       auth, me, sync, senders, analytics, health
  services/     gmail client, sync, aggregation, unsubscribe, account
  utils/        retry, rate limiter, job queue, validation
server/prisma   schema and migrations
server/test     vitest suites
```

## Deploying

The server can serve the built client itself, so production is a single web service. `render.yaml` sets it up on Render. See [docs/deploy.md](docs/deploy.md) for the full steps and what to change in Google Cloud.

## Limits

- **Testing mode.** Until the app passes Google's verification and a CASA security assessment (required for the restricted Gmail scopes), only up to 100 listed test users can sign in, and Google ends their access about every 7 days.
- **Quota.** Gmail's per-user quota caps a full scan at roughly 300 emails a minute.
- **One process.** Syncs run inside the web server, which suits a small number of users.

## Roadmap

- A separate sync worker (Redis and BullMQ) for more users
- Monthly per-sender trends
- Smarter cleanup suggestions
- A Chrome extension
