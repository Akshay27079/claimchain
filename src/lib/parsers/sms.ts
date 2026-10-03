/**
 * sms.ts — Parse pasted bank SMS / plain text messages.
 *
 * Handles common Indian bank SMS formats:
 *   "INR 1,250.00 debited from A/c XX1234 on 05-08-24"
 *   "Rs.1250 paid to LG SERVICE on 05/08/2024"
 *   "Your A/c XXXXX4321 is debited for Rs 1250.00 on 05-Aug-2024"
 *
 * Returns structured payment records for the Payment model.
 */

export interface SMSPayment {
  amount:    number;
  currency:  string;
  date:      Date | null;
  direction: "DEBIT" | "CREDIT" | "UNKNOWN";
  merchant?: string;
  rawText:   string;
}

export interface SMSParseResult {
  payments:  SMSPayment[];
  plainText: string;
}

// Match amounts like ₹1,250.00 / Rs.1250 / INR 1250 / Rs 1,250.00
const AMOUNT_PATTERNS = [
  /(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/gi,
];

// Common date patterns in Indian bank SMS
const DATE_PATTERNS = [
  /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/g,
  /(\d{1,2}[-\s](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-\s]\d{2,4})/gi,
];

const DEBIT_KEYWORDS  = /debited?|paid|payment|purchase|withdrawn?|sent/i;
const CREDIT_KEYWORDS = /credited?|received|refund|deposit/i;

function parseIndianDate(raw: string): Date | null {
  try {
    // DD-MM-YYYY or DD/MM/YYYY
    const m = raw.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
    if (m) {
      const day   = parseInt(m[1]);
      const month = parseInt(m[2]) - 1;
      const year  = parseInt(m[3]) < 100 ? 2000 + parseInt(m[3]) : parseInt(m[3]);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
    // DD-Mon-YYYY
    const m2 = raw.match(/(\d{1,2})[-\s](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-\s](\d{2,4})/i);
    if (m2) {
      return new Date(`${m2[1]} ${m2[2]} ${m2[3]}`);
    }
  } catch (_) {}
  return null;
}

export function parseSMS(text: string): SMSParseResult {
  const lines   = text.split("\n").filter(l => l.trim());
  const payments: SMSPayment[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Extract amount
    let amount = 0;
    for (const pattern of AMOUNT_PATTERNS) {
      const matches = [...trimmed.matchAll(pattern)];
      if (matches.length > 0) {
        amount = parseFloat(matches[0][1].replace(/,/g, ""));
        break;
      }
    }
    if (amount === 0) continue; // not a payment SMS

    // Extract date
    let date: Date | null = null;
    for (const pattern of DATE_PATTERNS) {
      const matches = [...trimmed.matchAll(pattern)];
      if (matches.length > 0) {
        date = parseIndianDate(matches[0][1]);
        if (date) break;
      }
    }

    // Direction
    const direction: SMSPayment["direction"] = DEBIT_KEYWORDS.test(trimmed)
      ? "DEBIT"
      : CREDIT_KEYWORDS.test(trimmed)
      ? "CREDIT"
      : "UNKNOWN";

    // Merchant — rough heuristic: word after "to" or before "on"
    const merchantMatch = trimmed.match(/(?:to|at)\s+([A-Z][A-Z\s]{2,20})(?:\s+on|\s+ref|\s+UPI|$)/i);
    const merchant = merchantMatch?.[1]?.trim();

    payments.push({ amount, currency: "INR", date, direction, merchant, rawText: trimmed });
  }

  return {
    payments,
    plainText: text,
  };
}
