# GlitchTip Telegram Bridge

Small [ElysiaJS](https://elysiajs.com/) service for [Bun](https://bun.sh/) that receives GlitchTip alert webhooks and forwards them to a Telegram bot chat.

GlitchTip general webhooks send Slack-like JSON with `text` and `attachments`. This bridge extracts the alert title, issue URL, culprit, project, environment, release, and other attachment fields, then sends a compact Telegram HTML message.

## Features

- Elysia typed routes and payload validation.
- Bun runtime, package manager, test runner, and Docker base image.
- Supports GlitchTip general webhook payloads and test notifications.
- Optional shared token in the webhook URL because GlitchTip webhooks do not require custom headers.
- Optional Telegram HTTP/HTTPS proxy via Bun's native `fetch` proxy support.
- Telegram HTML escaping and message truncation for Telegram's 4096 character limit.
- `/health` endpoint for containers and uptime checks.

## Requirements

- Bun 1.3+
- Telegram bot token from [@BotFather](https://t.me/BotFather)
- Telegram chat ID for the target user, group, supergroup, or channel

## Configuration

Copy `.env.example` to `.env` and set:

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | yes | - | Telegram bot token. |
| `TELEGRAM_CHAT_ID` | yes | - | Target Telegram chat ID. Groups and channels often start with `-100`. |
| `TELEGRAM_PROXY_HOST` | no | - | Optional proxy host for Telegram API calls. If empty, Telegram is called directly. |
| `TELEGRAM_PROXY_PORT` | no | - | Optional proxy port. Required when `TELEGRAM_PROXY_HOST` is set. |
| `TELEGRAM_PROXY_USERNAME` | no | - | Optional proxy username. |
| `TELEGRAM_PROXY_PASSWORD` | no | - | Optional proxy password. |
| `TELEGRAM_PROXY_URL` | no | - | Backwards-compatible full proxy URL override, for example `http://user:pass@proxy.example.com:8080`. Prefer the separate proxy variables above for new deployments. |
| `WEBHOOK_TOKEN` | recommended | - | Shared token accepted as `/webhook/:token` or `/webhook?token=...`. If empty, `/webhook` is public. |
| `HOST` | no | `0.0.0.0` | HTTP bind host. |
| `PORT` | no | `3000` | HTTP bind port. Set `8080` for Dokploy or platforms that route to that port. |
| `LOG_LEVEL` | no | `info` | `info`, `debug`, or `silent`. |
| `TELEGRAM_DISABLE_WEB_PAGE_PREVIEW` | no | `false` | Set to `true` to disable issue link previews. |

## Local Development

Install dependencies:

```bash
bun install
```

Run in watch mode:

```bash
bun run dev
```

Run tests and type checks:

```bash
bun test
bun run typecheck
```

## GlitchTip Setup

1. Create a Telegram bot with BotFather and add it to the target chat.
2. Set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, and `WEBHOOK_TOKEN`.
3. Run the bridge somewhere reachable from GlitchTip.
4. In GlitchTip, open project settings, create or edit a project alert, add an alert recipient, and choose a general webhook URL:

```text
https://bridge.example.com/webhook/change-me
```

You can also use:

```text
https://bridge.example.com/webhook?token=change-me
```

## Docker

Build and run directly:

```bash
docker build -t glitchtip-telegram-bridge .
docker run --rm -p 8080:8080 --env-file .env glitchtip-telegram-bridge
```

Or use Compose:

```bash
docker network create glitchtip-bridge
docker compose up -d --build
```

When GlitchTip runs from another Compose project on the same Docker host, attach its web/worker service to the same external network:

```yaml
networks:
  glitchtip-bridge:
    external: true
```

Then use this webhook URL from GlitchTip:

```text
http://glitchtip-telegram-bridge:8080/webhook/change-me
```

## Telegram Proxy

For a proxy without authentication:

```env
TELEGRAM_PROXY_HOST=proxy.example.com
TELEGRAM_PROXY_PORT=8080
TELEGRAM_PROXY_USERNAME=
TELEGRAM_PROXY_PASSWORD=
```

For a proxy with authentication:

```env
TELEGRAM_PROXY_HOST=proxy.example.com
TELEGRAM_PROXY_PORT=8080
TELEGRAM_PROXY_USERNAME=my-user
TELEGRAM_PROXY_PASSWORD=my-password
```

The bridge URL-encodes username and password before passing the proxy URL to Bun `fetch`.

## API

### `GET /health`

Returns:

```json
{ "ok": true, "service": "glitchtip-telegram-bridge" }
```

### `POST /webhook`

Accepts GlitchTip webhook JSON. If `WEBHOOK_TOKEN` is configured, pass `?token=...`.

### `POST /webhook/:token`

Accepts GlitchTip webhook JSON with the shared token in the path.

Example payload:

```json
{
  "text": "GlitchTip Alert",
  "attachments": [
    {
      "title": "Exception: Something failed",
      "title_link": "https://app.glitchtip.com/organizations/acme/issues/1",
      "text": "src/app.ts in handler",
      "fields": [
        { "title": "Project", "value": "api", "short": true },
        { "title": "Environment", "value": "production", "short": true },
        { "title": "Release", "value": "2026.05.08", "short": false }
      ]
    }
  ]
}
```

## Production Notes

- Always set `WEBHOOK_TOKEN` unless the bridge is protected by a private network or reverse proxy rules.
- If deploy logs still show `port:3000`, the runtime did not receive `PORT=8080` or an old image/Compose config is still running. Rebuild and redeploy after changing environment variables.
- Keep the bridge behind HTTPS when exposed publicly.
- Make sure the Telegram bot can post to the target chat. For channels, add it as an administrator.
- GlitchTip general webhook payloads are intentionally small; the bridge keeps unknown payload fields out of Telegram messages but accepts them for forward compatibility.
