export interface ParsedFrom {
  name: string | null;
  email: string;
  domain: string;
}

const ANGLE_ADDR = /<([^<>@\s]+@[^<>\s]+)>/;
const BARE_ADDR = /([^\s<>"(),;:]+@[^\s<>"(),;:]+)/;
const ENCODED_WORD = /=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g;

function decodeQ(text: string) {
  const latin = text
    .replace(/_/g, ' ')
    .replace(/=([0-9a-f]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
  return Buffer.from(latin, 'latin1');
}

// rfc 2047, e.g. =?UTF-8?B?SmFuZQ==?= -> Jane. leaves anything it can't decode as is
export function decodeEncodedWords(value: string) {
  // whitespace between two encoded words is not part of the text
  const joined = value.replace(/(\?=)\s+(=\?)/g, '$1$2');

  return joined.replace(ENCODED_WORD, (match, charset: string, enc: string, text: string) => {
    try {
      const bytes = enc.toUpperCase() === 'B' ? Buffer.from(text, 'base64') : decodeQ(text);
      // charset can carry a language suffix like utf-8*en
      return new TextDecoder(charset.split('*')[0]).decode(bytes);
    } catch {
      return match;
    }
  });
}

function cleanName(name: string | null, email: string) {
  if (!name) return null;

  const cleaned = decodeEncodedWords(name)
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
