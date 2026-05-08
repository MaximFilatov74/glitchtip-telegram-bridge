import type { NormalizedAlert } from "./glitchtip";

const TELEGRAM_MESSAGE_LIMIT = 4096;
const RESERVED_SUFFIX_LENGTH = 1;

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function fieldLine(title: string, value: string): string {
  return `<b>${escapeHtml(title)}:</b> ${escapeHtml(value)}`;
}

function formatAlert(alert: NormalizedAlert): string {
  const lines: string[] = [`<b>${escapeHtml(alert.heading)}</b>`];

  if (alert.title && alert.link) {
    lines.push(`<a href="${escapeHtml(alert.link)}">${escapeHtml(alert.title)}</a>`);
  } else if (alert.title) {
    lines.push(`<b>${escapeHtml(alert.title)}</b>`);
  }

  if (alert.culprit) {
    lines.push(escapeHtml(alert.culprit));
  }

  for (const field of alert.fields) {
    lines.push(fieldLine(field.title, field.value));
  }

  if (!alert.title && alert.link) {
    lines.push(`<a href="${escapeHtml(alert.link)}">Open in GlitchTip</a>`);
  }

  return lines.join("\n");
}

function formatPlainAlert(alert: NormalizedAlert): string {
  const lines: string[] = [alert.heading];

  if (alert.title) {
    lines.push(alert.title);
  }

  if (alert.culprit) {
    lines.push(alert.culprit);
  }

  for (const field of alert.fields) {
    lines.push(`${field.title}: ${field.value}`);
  }

  if (alert.link) {
    lines.push(alert.link);
  }

  return lines.join("\n");
}

function truncateEscapedPlainText(value: string, limit: number): string {
  let result = "";
  const maxBodyLength = limit - RESERVED_SUFFIX_LENGTH;

  for (const char of value) {
    const escapedChar = escapeHtml(char);
    if (result.length + escapedChar.length > maxBodyLength) {
      return `${result}…`;
    }

    result += escapedChar;
  }

  return result;
}

export function formatTelegramMessage(alerts: NormalizedAlert[]): string {
  const message = alerts.map(formatAlert).join("\n\n");

  if (message.length <= TELEGRAM_MESSAGE_LIMIT) {
    return message;
  }

  return truncateEscapedPlainText(
    alerts.map(formatPlainAlert).join("\n\n"),
    TELEGRAM_MESSAGE_LIMIT,
  );
}
