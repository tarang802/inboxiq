# Deploying Sieve

Sieve deploys as one web service. The Express server runs the API under `/api` and serves the built React app for everything else, so the browser only ever talks to one origin and the session cookie just works.

These steps use [Render](https://render.com) (the repo has a `render.yaml` blueprint) and [Neon](https://neon.tech) for Postgres. Any Node host works the same way: build with `npm run build`, run migrations with `npm run db:deploy -w server`, start with `npm start -w server`, and set the variables below.

## 1. Database

Create a Neon project (or a separate branch of your existing one, so production data stays apart from local testing). Migrations run on every deploy, so the database can start empty.

Neon gives two connection strings: a pooled one (the host has `-pooler` in it) and a direct one. Use the pooled one for `DATABASE_URL`. Migrations take a session lock that the pooler may not hold, so if `db:deploy` hangs or fails with a lock error, also set `DIRECT_URL` to the direct one. Only migrations read it.

## 2. Google Cloud

In the same Google Cloud project you use locally:

1. **APIs & Services → Credentials → your OAuth client.** Add an authorized redirect URI:
   `https://<your-app>.onrender.com/api/auth/google/callback`
   Keep the localhost one so local development still works.
2. **OAuth consent screen.** Add the production URL as the app's homepage and `https://<your-app>.onrender.com/privacy` as its privacy policy.
3. **Test users.** While the app is in Testing mode, only accounts listed here can sign in (up to 100), and Google ends their access about every 7 days. See [Going public](#going-public) for what it takes to open it to everyone.

## 3. Render

1. In Render, choose **New → Blueprint** and pick this repository. Render reads `render.yaml`.
2. Fill in the secret values it asks for:

| Variable               | Value                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------- |
| `CLIENT_URL`           | `https://<your-app>.onrender.com`                                                     |
| `GOOGLE_REDIRECT_URI`  | `https://<your-app>.onrender.com/api/auth/google/callback`                            |
| `DATABASE_URL`         | the Neon connection string                                                            |
| `GOOGLE_CLIENT_ID`     | from the OAuth client                                                                 |
| `GOOGLE_CLIENT_SECRET` | from the OAuth client                                                                 |
| `TOKEN_ENCRYPTION_KEY` | a new key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `DIRECT_URL`           | optional, Neon's direct connection string (see step 1)                                |

Use a fresh `TOKEN_ENCRYPTION_KEY` for production and keep it safe: if it changes, every stored Gmail connection stops working and users have to reconnect.

3. Deploy. The build installs everything, generates the Prisma client and builds both apps. The start command applies pending migrations, then starts the server. Render checks `/api/health` to know it's up.

If your app name isn't known until Render creates the service, deploy once with placeholder URLs, then update `CLIENT_URL`, `GOOGLE_REDIRECT_URI` and the Google redirect URI to match and redeploy.

With `NODE_ENV=production` the server checks its settings before it starts and exits with a list of what's wrong: a missing secret, a key that isn't 64 hex characters, a `CLIENT_URL` without https, a redirect URI that doesn't match `CLIENT_URL`, or a missing client build. If a deploy fails, the Render logs show that list. It names variables, never their values.

## Checklist

### Before the first deploy

- [ ] CI is green on `main`
- [ ] `npm run build` works locally
- [ ] A production Neon database or branch exists, separate from local testing
- [ ] A new `TOKEN_ENCRYPTION_KEY` is generated and saved in a password manager
- [ ] The Google OAuth client has the production redirect URI, and the localhost one is still there
- [ ] The consent screen has the homepage and privacy policy URLs
- [ ] Everyone who should try it is listed under Test users

### Deploy

- [ ] Create the blueprint and fill in the secrets
- [ ] The build log ends with the Vite build and no errors
- [ ] The deploy log shows `No pending migrations` or the migrations it applied, then `server running`
- [ ] Render marks the service live (the health check passed)

### Check it works

- [ ] `https://<your-app>.onrender.com/api/health` returns `{"status":"ok",...}`
- [ ] The landing page loads, and a hard refresh on `/dashboard` still loads the app
- [ ] Connect Gmail with a test user and land on the dashboard
- [ ] Run a sync. Senders appear within a minute and the progress keeps moving
- [ ] Mark a sender kept, open Insights, toggle the theme
- [ ] Log out, then sign back in
- [ ] The browser console shows no CSP errors

### Roll back if

- the health check fails or the service restarts in a loop
- sign-in ends anywhere other than the dashboard (usually a redirect URI mismatch)
- every sync fails

To roll back, open the service's **Events** in Render and choose **Rollback** on the last good deploy. Migrations so far only add tables and columns, so the older code still runs against the newer database. Fix configuration problems by editing the variables, which triggers a redeploy. No rollback needed.

### Later deploys

Every push to `main` deploys automatically once CI passes, if you turn on **Auto-Deploy: After CI checks pass** in the service settings. Before merging a migration that drops or renames something, deploy code that no longer uses it first.

## Things to know

- **Free instances sleep** after about 15 minutes without traffic and take a few seconds to wake. A sync keeps the instance awake while the dashboard polls it, but a restart or redeploy mid-sync marks that sync failed; running it again picks up from scratch.
- **Syncs run inside the web process**, two at a time. That's fine for a handful of users. A first sync of a year of mail takes around 15 minutes because of Gmail's per-user quota, so with many sign-ups at once people would wait in line. Splitting the sync worker into its own service is the next step at that point.
- **Gmail quota**: the per-user limit is 6,000 units a minute and a metadata read costs about 20, so a full scan reads roughly 300 emails a minute. Later syncs only fetch new mail and take seconds.

## Going public

Sieve uses the `gmail.metadata` scope, which Google classes as restricted. To let anyone sign in, the app has to be published and verified:

1. Switch the consent screen from Testing to In production.
2. Pass Google's app verification: a domain you own, homepage, privacy policy, a written justification for the scope, and a video showing how the app uses Gmail data.
3. Pass a CASA security assessment from a Google-approved lab, renewed every year.
4. Keep to the Google API Services User Data Policy, including Limited Use.

Until then, Testing mode with a list of test users is the way to share it.
