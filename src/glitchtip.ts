export type WebhookAttachmentField = {
  title?: unknown;
  value?: unknown;
  short?: unknown;
};

export type WebhookAttachment = {
  title?: unknown;
  title_link?: unknown;
  text?: unknown;
  color?: unknown;
  fields?: unknown;
};

export type GlitchTipWebhookPayload = {
  text?: unknown;
  attachments?: unknown;
};

export type NormalizedAlert = {
  heading: string;
  title?: string;
  link?: string;
  culprit?: string;
  color?: string;
  fields: Array<{ title: string; value: string }>;
};

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function normalizeFields(fields: unknown): Array<{ title: string; value: string }> {
  if (!Array.isArray(fields)) {
    return [];
  }

  return fields.flatMap((field): Array<{ title: string; value: string }> => {
    if (!field || typeof field !== "object") {
      return [];
    }

    const candidate = field as WebhookAttachmentField;
    const title = asString(candidate.title);
    const value = asString(candidate.value);

    return title && value ? [{ title, value }] : [];
  });
}

function normalizeAttachment(
  heading: string,
  attachment: unknown,
): NormalizedAlert | undefined {
  if (!attachment || typeof attachment !== "object") {
    return undefined;
  }

  const candidate = attachment as WebhookAttachment;
  const title = asString(candidate.title);
  const culprit = asString(candidate.text);
  const link = asString(candidate.title_link);
  const color = asString(candidate.color);
  const fields = normalizeFields(candidate.fields);

  if (!title && !culprit && fields.length === 0) {
    return undefined;
  }

  return {
    heading,
    title,
    link,
    culprit,
    color,
    fields,
  };
}

export function normalizeGlitchTipPayload(
  payload: GlitchTipWebhookPayload,
): NormalizedAlert[] {
  const heading = asString(payload.text) ?? "GlitchTip Alert";

  if (Array.isArray(payload.attachments)) {
    const alerts = payload.attachments.flatMap((attachment) => {
      const alert = normalizeAttachment(heading, attachment);
      return alert ? [alert] : [];
    });

    if (alerts.length > 0) {
      return alerts;
    }
  }

  return [{ heading, fields: [] }];
}
