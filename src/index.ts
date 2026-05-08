import { Elysia, t } from "elysia";
import { loadConfig } from "./config";
import { AppError, UnauthorizedError } from "./errors";
import {
  type GlitchTipWebhookPayload,
  normalizeGlitchTipPayload,
} from "./glitchtip";
import { formatTelegramMessage } from "./format";
import { TelegramClient } from "./telegram";

const config = loadConfig();
const telegram = new TelegramClient({
  botToken: config.telegramBotToken,
  chatId: config.telegramChatId,
  disableWebPagePreview: config.disableWebPagePreview,
});

const webhookBodySchema = t.Object(
  {
    text: t.Optional(t.String()),
    attachments: t.Optional(t.Array(t.Any())),
  },
  { additionalProperties: true },
);

function assertAuthorized(token?: string, queryToken?: string) {
  if (!config.webhookToken) {
    return;
  }

  if (token !== config.webhookToken && queryToken !== config.webhookToken) {
    throw new UnauthorizedError();
  }
}

function logInfo(message: string, meta?: Record<string, unknown>) {
  if (config.logLevel === "silent") {
    return;
  }

  console.info(JSON.stringify({ level: "info", message, ...meta }));
}

export const app = new Elysia()
  .onError(({ code, error, set }) => {
    if (error instanceof AppError) {
      set.status = error.statusCode;
      return { ok: false, error: error.message };
    }

    if (code === "VALIDATION") {
      set.status = 400;
      return { ok: false, error: "Invalid webhook payload" };
    }

    console.error(error);
    set.status = 500;
    return { ok: false, error: "Internal server error" };
  })
  .get("/health", () => ({
    ok: true,
    service: "glitchtip-telegram-bridge",
  }))
  .post(
    "/webhook",
    async ({ body, query, set }) => {
      assertAuthorized(undefined, query.token);

      const alerts = normalizeGlitchTipPayload(body as GlitchTipWebhookPayload);
      await telegram.sendMessage(formatTelegramMessage(alerts));

      set.status = 202;
      logInfo("alert forwarded", { alertCount: alerts.length });
      return { ok: true, forwarded: alerts.length };
    },
    {
      body: webhookBodySchema,
      query: t.Object({
        token: t.Optional(t.String()),
      }),
    },
  )
  .post(
    "/webhook/:token",
    async ({ body, params, set }) => {
      assertAuthorized(params.token);

      const alerts = normalizeGlitchTipPayload(body as GlitchTipWebhookPayload);
      await telegram.sendMessage(formatTelegramMessage(alerts));

      set.status = 202;
      logInfo("alert forwarded", { alertCount: alerts.length });
      return { ok: true, forwarded: alerts.length };
    },
    {
      body: webhookBodySchema,
      params: t.Object({
        token: t.String(),
      }),
    },
  );

if (import.meta.main) {
  app.listen({
    hostname: config.host,
    port: config.port,
  });

  logInfo("server started", {
    host: config.host,
    port: config.port,
    tokenRequired: Boolean(config.webhookToken),
  });
}
