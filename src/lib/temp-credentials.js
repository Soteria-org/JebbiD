import { randomBytes } from "crypto";

/**
 * Split out of src/lib/actions/auth-actions.js: a "use server" file may only
 * export async functions (Next.js constraint) — these are plain sync
 * helpers/constants shared by auth-actions.js and migration-actions.js, so
 * they live in a plain module instead.
 */

export function randomTempPassword() {
  // Cryptographically random (Node's crypto, not Math.random()), and guaranteed
  // — by construction, not by chance — to satisfy the same PASSWORD_REQUIREMENTS
  // enforced everywhere else (src/lib/password-policy.js): one char from each
  // required category is placed first, then the rest is filled randomly, then
  // the whole thing is shuffled so the guaranteed characters aren't always in
  // the same position.
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  const all = upper + lower + digits + symbols;

  const randChar = (set) => set[randomBytes(1)[0] % set.length];
  const chars = [randChar(upper), randChar(lower), randChar(digits), randChar(symbols)];
  while (chars.length < 12) chars.push(randChar(all));

  // Fisher-Yates shuffle using crypto-random indices
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomBytes(1)[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

/**
 * Spec: docs/migration/HISTORICAL_DATA_MIGRATION_SPEC.md §3.2/§6.2 — a temp
 * password (any admin-issued one, not just migrated-investor invites) never
 * expired before this. 48 hours, checked at sign-in time against
 * profiles.temp_password_issued_at (migration historical_migration_schema).
 */
export const TEMP_PASSWORD_EXPIRY_HOURS = 48;

export function isTempPasswordExpired(issuedAtIso) {
  if (!issuedAtIso) return false; // no timestamp on record (e.g. pre-migration accounts) — don't retroactively lock anyone out
  const issuedAt = new Date(issuedAtIso).getTime();
  const ageHours = (Date.now() - issuedAt) / (1000 * 60 * 60);
  return ageHours > TEMP_PASSWORD_EXPIRY_HOURS;
}
