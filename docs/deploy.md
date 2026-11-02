# Deploying Sieve

Sieve deploys as one web service. The Express server runs the API under `/api` and serves the built React app for everything else, so the browser only ever talks to one origin and the session cookie just works.

These steps use [Render](https://render.com) (the repo has a `render.yaml` blueprint) and [Neon](https://neon.tech) for Postgres. Any Node host works the same way: build with `npm run build`, run migrations with `npm run db:deploy -w server`, start with `npm start -w server`, and set the variables below.

## 1. Database

Create a Neon project (or a separate branch of your existing one, so production data stays apart from local testing) and copy its connection string. Migrations run on every deploy, so the database can start empty.

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

Use a fresh `TOKEN_ENCRYPTION_KEY` for production and keep it safe: if it changes, every stored Gmail connection stops working and users have to reconnect.

3. Deploy. The build installs everything, generates the Prisma client and builds both apps. The start command applies pending migrations, then starts the server. Render checks `/api/health` to know it's up.

If your app name isn't known until Render creates the service, deploy once with placeholder URLs, then update `CLIENT_URL`, `GOOGLE_REDIRECT_URI` and the Google redirect URI to match and redeploy.

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
