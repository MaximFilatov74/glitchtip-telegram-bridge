import { TelegramError } from "./errors";

const TELEGRAM_REQUEST_TIMEOUT_MS = 10_000;

export type TelegramClientConfig = {
  botToken: string;
  chatId: string;
  proxyUrl?: string;
  disableWebPagePreview: boolean;
};

type TelegramApiResponse =
  | { ok: true; result: unknown }
  | { ok: false; description?: string };

export class TelegramClient {
  private readonly apiUrl: string;

  constructor(private readonly config: TelegramClientConfig) {
    this.apiUrl = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
  }

  async sendMessage(text: string): Promise<void> {
    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        chat_id: this.config.chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: this.config.disableWebPagePreview,
      }),
      proxy: this.config.proxyUrl,
      signal: AbortSignal.timeout(TELEGRAM_REQUEST_TIMEOUT_MS),
    });

    const payload = (await response.json().catch(() => undefined)) as
      | TelegramApiResponse
      | undefined;

    if (!response.ok || payload?.ok === false) {
      const description =
        payload?.ok === false && payload.description
          ? `: ${payload.description}`
          : "";
      throw new TelegramError(`Telegram sendMessage failed${description}`);
    }
  }
}
