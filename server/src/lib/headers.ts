export interface ParsedFrom {
  name: string | null;
  email: string;
  domain: string;
}

const ANGLE_ADDR = /<([^<>@\s]+@[^<>\s]+)>/;
const BARE_ADDR = /([^\s<>"(),;:]+@[^\s<>"(),;:]+)/;

function cleanName(name: string | null, email: string) {
  if (!name) return null;

  const cleaned = name
    .replace(/^"(.*)"$/, '$1')
    .replace(/\\(.)/g, '$1')
    .trim();

  // some senders put the address in the name slot too
  if (!cleaned || cleaned.toLowerCase() === email) return null;
  return cleaned;
}

// handles `"Jane" <jane@x.com>`, `Jane <jane@x.com>`, `jane@x.com` and `jane@x.com (Jane)`
export function parseFrom(value: string | undefined): ParsedFrom | null {
  if (!value) return null;

  const angle = value.match(ANGLE_ADDR);
  const raw = angle ? angle[1] : value.match(BARE_ADDR)?.[1];
  if (!raw) return null;

  const email = raw.trim().toLowerCase();
  const domain = email.slice(email.lastIndexOf('@') + 1);
  if (!domain) return null;

  const rawName = angle
    ? value.slice(0, angle.index).trim()
    : (value.match(/\(([^)]*)\)/)?.[1] ?? null);

  return { name: cleanName(rawName, email), email, domain };
}
