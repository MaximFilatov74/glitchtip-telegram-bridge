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
};

const truthy = new Set(["1", "true", "yes", "on"]);

function requiredEnv(name: string): string {
  const value = Bun.env[name]?.trim();
  if (!value) {
    throw new AppError(`Missing required environment variable: ${name}`, 500);
  }

  return value;
}

function parsePort(value: string | undefined): number {
  const port = Number(value ?? "3000");
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

export function loadConfig(): AppConfig {
  return {
    host: Bun.env.HOST?.trim() || "0.0.0.0",
    port: parsePort(Bun.env.PORT),
    telegramBotToken: requiredEnv("TELEGRAM_BOT_TOKEN"),
    telegramChatId: requiredEnv("TELEGRAM_CHAT_ID"),
    telegramProxyUrl: Bun.env.TELEGRAM_PROXY_URL?.trim() || undefined,
    webhookToken: Bun.env.WEBHOOK_TOKEN?.trim() || undefined,
    logLevel: parseLogLevel(Bun.env.LOG_LEVEL),
    disableWebPagePreview: truthy.has(
      Bun.env.TELEGRAM_DISABLE_WEB_PAGE_PREVIEW?.trim().toLowerCase() ?? "",
    ),
  };
}
