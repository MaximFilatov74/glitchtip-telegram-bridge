import { describe, expect, test } from "bun:test";
import { normalizeGlitchTipPayload } from "../src/glitchtip";

describe("normalizeGlitchTipPayload", () => {
  test("extracts attachments and filters empty fields", () => {
    const alerts = normalizeGlitchTipPayload({
      text: "GlitchTip Alert (2 issues)",
      attachments: [
        {
          title: "TypeError",
          title_link: "https://glitchtip.example/issues/1",
          text: "src/index.ts",
          color: "#cc0000",
          fields: [
            { title: "Project", value: "backend", short: true },
            { title: "Release", value: "" },
          ],
        },
      ],
    });

    expect(alerts).toEqual([
      {
        heading: "GlitchTip Alert (2 issues)",
        title: "TypeError",
        link: "https://glitchtip.example/issues/1",
        culprit: "src/index.ts",
        color: "#cc0000",
        fields: [{ title: "Project", value: "backend" }],
      },
    ]);
  });

  test("keeps a useful fallback for a test notification without attachments", () => {
    expect(normalizeGlitchTipPayload({ text: "GlitchTip Test Notification" })).toEqual([
      {
        heading: "GlitchTip Test Notification",
        fields: [],
      },
    ]);
  });
});
