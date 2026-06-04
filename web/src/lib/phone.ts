/**
 * Validation + formatting helpers for Haitian (+509) phone numbers.
 * Phone is always stored/transmitted in the canonical form: `+509XXXXXXXX`.
 */

export const HAITI_PHONE_PREFIX = "+509";
export const HAITI_PHONE_NATIONAL_LEN = 8;

/**
 * Returns the 8 national digits from any input. Strips the +509 prefix,
 * removes spaces/dashes, and clamps to 8 digits.
 */
export function extractHaitiDigits(raw: string): string {
  if (!raw) return "";
  const digits = raw.replace(/[^\d]/g, "");
  // If the user typed the 509 prefix, drop it. Otherwise treat as national digits.
  const trimmed = digits.startsWith("509") ? digits.slice(3) : digits;
  return trimmed.slice(0, HAITI_PHONE_NATIONAL_LEN);
}

/** Builds the canonical +509XXXXXXXX string (or empty if no digits). */
export function toHaitiPhone(nationalDigits: string): string {
  const d = extractHaitiDigits(nationalDigits);
  return d.length > 0 ? `${HAITI_PHONE_PREFIX}${d}` : "";
}

/** Pretty-print as `1234 5678` for display in the input. */
export function formatHaitiPhoneDisplay(nationalDigits: string): string {
  const d = extractHaitiDigits(nationalDigits);
  if (d.length <= 4) return d;
  return `${d.slice(0, 4)} ${d.slice(4)}`;
}

/** True when the value is a complete 8-digit Haitian phone. */
export function isValidHaitiPhone(nationalDigits: string): boolean {
  return extractHaitiDigits(nationalDigits).length === HAITI_PHONE_NATIONAL_LEN;
}
