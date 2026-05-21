import { AppError } from "./errors";

export type AppConfig = {
  host: string;
  port: number;
  telegramBotToken: string;
  telegramChatId: string;
  telegramProxyUrl?: string;
  webhookToken?: string;
  logLevel: "silent" | "info" | "debug";
  disableWebPagePreview: boolean;
  startupNotificationEnabled: boolean;
};

const truthy = new Set(["1", "true", "yes", "on"]);
const falsy = new Set(["0", "false", "no", "off"]);

function requiredEnv(name: string): string {
  const value = Bun.env[name]?.trim();
  if (!value) {
    throw new AppError(`Missing required environment variable: ${name}`, 500);
  }

  return value;
}

function parsePort(value: string | undefined): number {
  const port = Number(value ?? "8080");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new AppError("PORT must be an integer between 1 and 65535", 500);
  }

  return port;
}

function parseLogLevel(value: string | undefined): AppConfig["logLevel"] {
  if (value === "silent" || value === "debug") {
    return value;
  }

  return "info";
}

function optionalEnv(name: string): string | undefined {
  return Bun.env[name]?.trim() || undefined;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return defaultValue;
  }

  if (truthy.has(normalized)) {
    return true;
  }

  if (falsy.has(normalized)) {
    return false;
  }

  return defaultValue;
}

function buildProxyUrl(): string | undefined {
  const legacyProxyUrl = optionalEnv("TELEGRAM_PROXY_URL");
  if (legacyProxyUrl) {
    return legacyProxyUrl;
  }

  const host = optionalEnv("TELEGRAM_PROXY_HOST");
  const port = optionalEnv("TELEGRAM_PROXY_PORT");

  if (!host && !port) {
    return undefined;
  }

  if (!host || !port) {
    throw new AppError(
      "TELEGRAM_PROXY_HOST and TELEGRAM_PROXY_PORT must be set together",
      500,
    );
  }

  const username = optionalEnv("TELEGRAM_PROXY_USERNAME");
  const password = optionalEnv("TELEGRAM_PROXY_PASSWORD");
  const credentials =
    username && password
      ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`
      : "";

  return `http://${credentials}${host}:${port}`;
}

export function loadConfig(): AppConfig {
  return {
    host: Bun.env.HOST?.trim() || "0.0.0.0",
    port: parsePort(Bun.env.PORT),
    telegramBotToken: requiredEnv("TELEGRAM_BOT_TOKEN"),
    telegramChatId: requiredEnv("TELEGRAM_CHAT_ID"),
    telegramProxyUrl: buildProxyUrl(),
    webhookToken: Bun.env.WEBHOOK_TOKEN?.trim() || undefined,
    logLevel: parseLogLevel(Bun.env.LOG_LEVEL),
    disableWebPagePreview: parseBoolean(
      Bun.env.TELEGRAM_DISABLE_WEB_PAGE_PREVIEW,
      false,
    ),
    startupNotificationEnabled: parseBoolean(
      Bun.env.STARTUP_NOTIFICATION_ENABLED,
      true,
    ),
  };
}
