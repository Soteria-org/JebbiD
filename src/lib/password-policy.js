/**
 * Single source of truth for password strength — imported by BOTH server actions
 * (auth-actions.js, where it's actually enforced — never trust a client-side check
 * alone) and the client-side strength meter (PasswordStrengthMeter.jsx, where it
 * gives real-time feedback). Changing the policy here changes it everywhere,
 * instead of drifting between a frontend check and a backend check that quietly
 * stop agreeing with each other.
 */

export const PASSWORD_REQUIREMENTS = [
  { key: "length", label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { key: "upper", label: "One uppercase letter (A-Z)", test: (pw) => /[A-Z]/.test(pw) },
  { key: "lower", label: "One lowercase letter (a-z)", test: (pw) => /[a-z]/.test(pw) },
  { key: "digit", label: "One number (0-9)", test: (pw) => /[0-9]/.test(pw) },
  { key: "symbol", label: "One symbol (e.g. ! @ # $ %)", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

/** Returns { valid, results: [{key, label, passed}], failedLabels: [...] } */
export function checkPasswordStrength(password) {
  const pw = password || "";
  const results = PASSWORD_REQUIREMENTS.map((r) => ({ key: r.key, label: r.label, passed: r.test(pw) }));
  const failedLabels = results.filter((r) => !r.passed).map((r) => r.label);
  return { valid: failedLabels.length === 0, results, failedLabels };
}

/** Server-side guard. Returns null if strong enough, or a ready-to-display error string. */
export function passwordStrengthError(password) {
  const { valid, failedLabels } = checkPasswordStrength(password);
  if (valid) return null;
  return "Password is not strong enough. Missing: " + failedLabels.join(", ") + ".";
}

/** 0-4 score for the strength meter's visual bar (not a security measure by itself — the checklist above is the real gate). */
export function passwordStrengthScore(password) {
  return checkPasswordStrength(password).results.filter((r) => r.passed).length;
}
