import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import { HttpError } from '../utils/httpError';

// unsubscribe links come from email headers, which anyone can write. without this
// a crafted email could make the server POST to its own network or cloud metadata
const blocked = new BlockList();

const V4_RANGES: [string, number][] = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];
const V6_RANGES: [string, number][] = [
  ['::', 128],
  ['::1', 128],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
];

for (const [net, prefix] of V4_RANGES) blocked.addSubnet(net, prefix, 'ipv4');
for (const [net, prefix] of V6_RANGES) blocked.addSubnet(net, prefix, 'ipv6');

function isBlocked(address: string, family: number) {
  // ::ffff:10.0.0.1 is an ipv4 address wearing an ipv6 costume
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return blocked.check(mapped[1], 'ipv4');
  return blocked.check(address, family === 6 ? 'ipv6' : 'ipv4');
}

// throws unless the url is https and every address it resolves to is public.
// a dns answer could still change between this check and the request; good enough for v1
export async function assertPublicUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new HttpError(400, 'unsubscribe link is not a valid url');
  }

  if (url.protocol !== 'https:') throw new HttpError(400, 'unsubscribe link must use https');
  if (url.username || url.password) throw new HttpError(400, 'unsubscribe link has credentials');

  const host = url.hostname.replace(/^\[|\]$/g, '');
  let addresses: { address: string; family: number }[];
  try {
    addresses = isIP(host)
      ? [{ address: host, family: isIP(host) }]
      : await lookup(host, { all: true });
  } catch {
    throw new HttpError(502, 'could not reach the unsubscribe link');
  }

  if (addresses.some(({ address, family }) => isBlocked(address, family))) {
    throw new HttpError(400, 'unsubscribe link points at a private network');
  }
}
