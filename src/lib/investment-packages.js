export const FALLBACK_PACKAGES = [
  { id: "standard-demo", code: "standard", name: "Standard Package", min_amount: 100000, max_amount: 999999999, annual_return_rate: 30, duration_months: 12 },
  { id: "corporate-demo", code: "corporate", name: "Corporate Package", min_amount: 1000000, max_amount: null, annual_return_rate: 40, duration_months: 12 },
];

export function getFallbackPackages() {
  return FALLBACK_PACKAGES;
}
