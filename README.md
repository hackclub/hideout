# Hideout

This is a YSWS program where you build a project for a week, then break into other people's projects the next week (by finding and fixing bugs), and earn acorns to spend in the shop.

Built with SvelteKit, Postgres and Drizzle.

## Running it locally

You need Node 22, Docker (for Postgres) and these credentials:

- Hack Club Auth: an OAuth app with the callback `APP_URL/auth/callback`
- Hackatime: an OAuth app with the callback `APP_URL/connect/hackatime/callback`
- GitHub: a token for API reads and an OAuth app with the callback `APP_URL/connect/github/callback`
- Slack: a bot token with `chat:write` and `channels:write.invites`. New signups are added to the channels in `SLACK_SIGNUP_CHANNELS` (comma separated IDs), and the bot has to be in those channels
- Airtable: a token, a base and its `YSWS Project Submission` table for Unified, with a single-line-text field `hideout_ship_id`
- An S3 compatible bucket (R2 works) for project screenshots

```sh
npm install
docker compose -f infra/docker-compose.yml -p hideout up -d
cp .env.example .env
npm run dev
```

Postgres from the compose file is at `postgres://hideout:hideout@127.0.0.1:5436/hideout` and the dev server runs on `http://127.0.0.1:5195`. `TOKEN_ENCRYPTION_KEY` can be any long random string (`openssl rand -hex 32`). People whose Slack ID is in `ADMIN_SLACK_IDS` or whose email is in `ADMIN_EMAILS` (comma separated) become admins when they sign in. Migrations and the first season are set up when the server starts.

## Deploying

The `Dockerfile` builds the app and runs `node build` on port 3000. It sets `BODY_SIZE_LIMIT=12M` so two screenshot uploads fit. Set the variables from `.env.example`, with `APP_URL` and `ORIGIN` both set to the public URL.

On boot the server runs the migrations in `drizzle/`, then adds Season 1 and the shop items if the database is empty, before it takes requests.

Run exactly one instance. A timer inside the server hands out targets, sends reminders, syncs merges and flushes Slack and Unified, and a second copy would do all of that twice.

Screenshots live in the bucket and are served through `/uploads/<name>`. The GitHub webhook at `/api/github` is optional (set `GITHUB_WEBHOOK_SECRET` to use it). Without it, merges are picked up every 10 minutes.

## Scripts

| Script                | What it does                                                |
| --------------------- | ----------------------------------------------------------- |
| `npm run dev`         | Dev server                                                  |
| `npm run build`       | Production build into `build/`                              |
| `npm start`           | Runs the production build                                   |
| `npm run check`       | Type checks                                                 |
| `npm test`            | Unit tests (scoring, payout, assignment, phases and more)   |
| `npm run format`      | Prettier                                                    |
| `npm run db:generate` | New migration from changes to `src/lib/server/db/schema.ts` |
| `npm run db:migrate`  | Applies migrations                                          |

## Contributing

Contributions are more than welcome! If you find a bug, feel free to open a PR or a GitHub issue. I might not be actively monitoring PRs, so ping @Obay on Slack if you need yours merged faster.
