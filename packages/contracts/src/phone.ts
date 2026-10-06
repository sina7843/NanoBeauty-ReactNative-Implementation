// North American (Canadian) mobile numbers, shared by the app (AUT-01 validation) and the API (identity).

/** "(604) 555-0123", "604-555-0123", "+1 604 555 0123" → "+16045550123"; anything else → null. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  // NANP: area code and exchange can't start with 0 or 1.
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(national)) return null;
  return `+1${national}`;
}

/** "+16045550123" → "(604) •••-••23" (AUT-02 "Sent to"). */
export function maskPhone(e164: string): string {
  const national = e164.replace(/^\+1/, '');
  return `(${national.slice(0, 3)}) •••-••${national.slice(-2)}`;
}

/** "+16045550123" → "(604) 555-0123" for the person's own number. */
export function formatPhone(e164: string): string {
  const n = e164.replace(/^\+1/, '');
  return `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`;
}
