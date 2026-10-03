/**
 * whatsapp.ts — Parse WhatsApp exported .txt chat files.
 *
 * Handles both formats:
 *   [03/08/2024, 10:45:23] Ravi: The technician will come tomorrow.
 *   03/08/2024, 10:45 - Ravi: The technician will come tomorrow.
 *
 * Returns structured messages for AI extraction.
 */

export interface WhatsAppMessage {
  timestamp:  Date;
  sender:     string;
  content:    string;
  rawLine:    string;
}

export interface WhatsAppParseResult {
  messages:    WhatsAppMessage[];
  plainText:   string;           // flat text for AI ingestion
  participants: string[];
  dateRange:   { start: Date; end: Date } | null;
}

// Regex patterns for the two common WhatsApp export formats
const PATTERN_BRACKETS =
  /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\]\s*([^:]+):\s*(.+)$/;

const PATTERN_DASH =
  /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}(?:\s*[AP]M)?)\s*-\s*([^:]+):\s*(.+)$/;

function parseWhatsAppDate(dateStr: string, timeStr: string): Date {
  // Normalise DD/MM/YYYY or MM/DD/YYYY — we assume DD/MM for Indian exports
  const parts = dateStr.split("/");
  if (parts.length !== 3) return new Date();
  const [day, month, year] = parts.map(Number);
  const fullYear = year < 100 ? 2000 + year : year;

  // Parse time
  const timeParts = timeStr.trim().match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?/i);
  if (!timeParts) return new Date(fullYear, month - 1, day);

  let hours   = parseInt(timeParts[1]);
  const mins  = parseInt(timeParts[2]);
  const secs  = timeParts[3] ? parseInt(timeParts[3]) : 0;
  const ampm  = timeParts[4]?.toUpperCase();

  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;

  return new Date(fullYear, month - 1, day, hours, mins, secs);
}

export function parseWhatsApp(text: string): WhatsAppParseResult {
  const lines    = text.split("\n");
  const messages: WhatsAppMessage[] = [];
  let   current: WhatsAppMessage | null = null;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // System messages: "<Media omitted>", "Messages and calls are end-to-end encrypted"
    if (trimmed.includes("end-to-end encrypted") ||
        trimmed === "<Media omitted>" ||
        trimmed === "This message was deleted") {
      continue;
    }

    const matchB = trimmed.match(PATTERN_BRACKETS);
    const matchD = trimmed.match(PATTERN_DASH);
    const match  = matchB ?? matchD;

    if (match) {
      if (current) messages.push(current);
      const [, dateStr, timeStr, sender, content] = match;
      current = {
        timestamp: parseWhatsAppDate(dateStr, timeStr),
        sender:    sender.trim(),
        content:   content.trim(),
        rawLine,
      };
    } else if (current) {
      // Continuation of a multi-line message
      current.content += "\n" + trimmed;
    }
  }
  if (current) messages.push(current);

  const participants = [...new Set(messages.map(m => m.sender))].filter(
    s => s !== "You" && !s.includes("+")
  );

  const timestamps = messages.map(m => m.timestamp).filter(d => !isNaN(d.getTime()));
  const dateRange = timestamps.length > 0
    ? { start: timestamps[0], end: timestamps[timestamps.length - 1] }
    : null;

  // Build flat text for AI — include timestamps so AI can extract dates
  const plainText = messages
    .map(m => `[${m.timestamp.toISOString().slice(0, 10)} ${m.timestamp.toTimeString().slice(0, 5)}] ${m.sender}: ${m.content}`)
    .join("\n");

  return { messages, plainText, participants, dateRange };
}
