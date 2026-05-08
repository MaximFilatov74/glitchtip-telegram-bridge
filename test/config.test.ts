import { afterEach, describe, expect, test } from "bun:test";
import { loadConfig } from "../src/config";

const envKeys = [
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "TELEGRAM_PROXY_URL",
  "TELEGRAM_PROXY_HOST",
  "TELEGRAM_PROXY_PORT",
  "TELEGRAM_PROXY_USERNAME",
  "TELEGRAM_PROXY_PASSWORD",
  "WEBHOOK_TOKEN",
  "HOST",
  "PORT",
  "LOG_LEVEL",
  "TELEGRAM_DISABLE_WEB_PAGE_PREVIEW",
] as const;

const originalEnv = Object.fromEntries(
  envKeys.map((key) => [key, Bun.env[key]]),
);

function resetEnv() {
  for (const key of envKeys) {
    const value = originalEnv[key];
    if (value === undefined) {
      delete Bun.env[key];
    } else {
      Bun.env[key] = value;
    }
  }
}

function setRequiredEnv() {
  Bun.env.TELEGRAM_BOT_TOKEN = "token";
  Bun.env.TELEGRAM_CHAT_ID = "123";
}

afterEach(resetEnv);

describe("loadConfig", () => {
  test("builds proxy URL from separate host and port settings", () => {
    resetEnv();
    setRequiredEnv();
    Bun.env.TELEGRAM_PROXY_HOST = "proxy.example.com";
    Bun.env.TELEGRAM_PROXY_PORT = "8080";

    expect(loadConfig().telegramProxyUrl).toBe(
      "http://proxy.example.com:8080",
    );
  });

  test("adds encoded proxy credentials when username and password are set", () => {
    resetEnv();
    setRequiredEnv();
    Bun.env.TELEGRAM_PROXY_HOST = "proxy.example.com";
    Bun.env.TELEGRAM_PROXY_PORT = "8080";
    Bun.env.TELEGRAM_PROXY_USERNAME = "user@example.com";
    Bun.env.TELEGRAM_PROXY_PASSWORD = "pa:ss@word";

    expect(loadConfig().telegramProxyUrl).toBe(
      "http://user%40example.com:pa%3Ass%40word@proxy.example.com:8080",
    );
  });

  test("keeps TELEGRAM_PROXY_URL as a backwards-compatible override", () => {
    resetEnv();
    setRequiredEnv();
    Bun.env.TELEGRAM_PROXY_URL = "https://legacy.example.com:8443";
    Bun.env.TELEGRAM_PROXY_HOST = "proxy.example.com";
    Bun.env.TELEGRAM_PROXY_PORT = "8080";

    expect(loadConfig().telegramProxyUrl).toBe(
      "https://legacy.example.com:8443",
    );
  });
});
