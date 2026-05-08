import { describe, expect, test } from "bun:test";
import { formatTelegramMessage } from "../src/format";
import { normalizeGlitchTipPayload } from "../src/glitchtip";

describe("formatTelegramMessage", () => {
  test("formats a GlitchTip general webhook payload for Telegram HTML", () => {
    const alerts = normalizeGlitchTipPayload({
      text: "GlitchTip Alert",
      attachments: [
        {
          title: "Exception: <boom>",
          title_link: "https://glitchtip.example/issues/1",
          text: "src/app.ts in handler",
          fields: [
            { title: "Project", value: "api" },
            { title: "Environment", value: "production" },
          ],
        },
      ],
    });

    expect(formatTelegramMessage(alerts)).toContain(
      '<a href="https://glitchtip.example/issues/1">Exception: &lt;boom&gt;</a>',
    );
    expect(formatTelegramMessage(alerts)).toContain("<b>Project:</b> api");
    expect(formatTelegramMessage(alerts)).toContain(
      "<b>Environment:</b> production",
    );
  });

  test("truncates long messages to Telegram limit", () => {
    const message = formatTelegramMessage([
      {
        heading: "GlitchTip Alert",
        title: "x".repeat(5000),
        fields: [],
      },
    ]);

    expect(message.length).toBe(4096);
    expect(message.endsWith("…")).toBe(true);
    expect(message).not.toContain("<b>");
  });
});
