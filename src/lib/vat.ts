// South African VAT numbers are 10 digits starting with 4 (SARS). Customers and
// resellers often type them with spaces or dashes, so compare digits only.
// Mirrored server-side in supabase/functions/_shared/payment.ts.

export function normaliseVat(value: string): string {
  return value.replace(/[\s-]/g, "");
}

/** Empty is allowed: the field is optional. */
export function vatError(value: string): string | null {
  const v = normaliseVat(value);
  if (!v) return null;
  return /^4\d{9}$/.test(v) ? null : "A South African VAT number is 10 digits starting with 4.";
}
