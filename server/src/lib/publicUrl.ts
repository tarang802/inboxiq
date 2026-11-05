import { lookup as dnsLookup } from 'node:dns';
import { lookup } from 'node:dns/promises';
import { BlockList, isIP, type LookupFunction } from 'node:net';
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

export class PrivateAddressError extends Error {
  constructor(hostname: string) {
    super(`${hostname} resolves to a private address`);
    this.name = 'PrivateAddressError';
  }
}

// the lookup a request's socket uses, so the address that gets checked is the one it
// connects to. checking first and connecting later leaves a gap where a dns server
// can answer public for the check and private for the request (dns rebinding)
export const publicLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, '', 0);
    if (!addresses.length || addresses.some((a) => isBlocked(a.address, a.family))) {
      return callback(new PrivateAddressError(hostname), '', 0);
    }
    if (options.all) return callback(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
};

// throws unless the url is https and every address it resolves to right now is public.
// it gives a clear error up front; publicLookup is what holds at connect time
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
