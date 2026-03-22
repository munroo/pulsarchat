/**
 * Room code generation.
 *
 * Uses crypto.getRandomValues instead of Math.random for
 * better entropy. Generates 6-char alphanumeric codes.
 */

const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L confusion

export function generateCode(length = 6) {
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => CHARS[v % CHARS.length]).join("");
}
