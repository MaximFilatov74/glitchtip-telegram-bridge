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
| `PORT` | no | `8080` | HTTP bind port. |
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

Create `.env`:

```env
TELEGRAM_BOT_TOKEN=123456:replace-me
TELEGRAM_CHAT_ID=-1001234567890
TELEGRAM_PROXY_URL=
TELEGRAM_PROXY_HOST=
TELEGRAM_PROXY_PORT=
TELEGRAM_PROXY_USERNAME=
TELEGRAM_PROXY_PASSWORD=
WEBHOOK_TOKEN=change-me
HOST=0.0.0.0
PORT=8080
LOG_LEVEL=info
TELEGRAM_DISABLE_WEB_PAGE_PREVIEW=false
```

Create `docker-compose.yml`:

```yaml
services:
  glitchtip-telegram-bridge:
    image: ghcr.io/maximfilatov74/glitchtip-telegram-bridge:latest
    restart: unless-stopped
    ports:
      - "${PORT:-8080}:${PORT:-8080}"
    environment:
      TELEGRAM_BOT_TOKEN: "${TELEGRAM_BOT_TOKEN}"
      TELEGRAM_CHAT_ID: "${TELEGRAM_CHAT_ID}"
      TELEGRAM_PROXY_URL: "${TELEGRAM_PROXY_URL:-}"
      TELEGRAM_PROXY_HOST: "${TELEGRAM_PROXY_HOST:-}"
      TELEGRAM_PROXY_PORT: "${TELEGRAM_PROXY_PORT:-}"
      TELEGRAM_PROXY_USERNAME: "${TELEGRAM_PROXY_USERNAME:-}"
      TELEGRAM_PROXY_PASSWORD: "${TELEGRAM_PROXY_PASSWORD:-}"
      WEBHOOK_TOKEN: "${WEBHOOK_TOKEN}"
      HOST: "0.0.0.0"
      PORT: "${PORT:-8080}"
      LOG_LEVEL: "${LOG_LEVEL:-info}"
      TELEGRAM_DISABLE_WEB_PAGE_PREVIEW: "${TELEGRAM_DISABLE_WEB_PAGE_PREVIEW:-false}"
```

Pull the image and start the service:

```bash
docker compose pull
docker compose up -d
```

Check the service:

Open `http://localhost:8080/health` in a browser or run `docker compose ps`.

### Same-host GlitchTip

When GlitchTip runs from another Compose project on the same Docker host, create a shared Docker network:

```bash
docker network create glitchtip-bridge
```

Attach the bridge service to it:

```yaml
services:
  glitchtip-telegram-bridge:
    networks:
      - glitchtip-bridge

networks:
  glitchtip-bridge:
    external: true
```

Attach the GlitchTip `web` and `worker` services to the same network:

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
