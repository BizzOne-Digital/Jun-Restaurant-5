const EMAIL_TYPO_MAP: Record<string, string> = {
  "gamil.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gnail.com": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "outlook.con": "outlook.com",
  "yahoo.con": "yahoo.com",
  "gmail.con": "gmail.com",
};

export function suggestEmailTypo(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at <= 0) return null;
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  const corrected = EMAIL_TYPO_MAP[domain];
  if (!corrected) return null;
  return `${local}@${corrected}`;
}

export function hasValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function hasMinPhoneDigits(phone: string, minDigits = 7): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= minDigits;
}
