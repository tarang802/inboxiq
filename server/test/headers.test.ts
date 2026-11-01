import { describe, expect, it } from 'vitest';
import {
  decodeEncodedWords,
  isOneClick,
  parseFrom,
  parseListUnsubscribe,
} from '../src/lib/headers';

describe('parseFrom', () => {
  it.each([
    ['"Jane Doe" <Jane@Example.com>', 'Jane Doe', 'jane@example.com', 'example.com'],
    ['Shop News <news@mail.shop.io>', 'Shop News', 'news@mail.shop.io', 'mail.shop.io'],
    ['alerts@bank.com', null, 'alerts@bank.com', 'bank.com'],
    ['<x@y.com>', null, 'x@y.com', 'y.com'],
    ['bob@b.org (Bob B)', 'Bob B', 'bob@b.org', 'b.org'],
  ])('parses %s', (header, name, email, domain) => {
    expect(parseFrom(header)).toEqual({ name, email, domain });
  });

  it('drops a name that is just the address', () => {
    expect(parseFrom('"a@b.com" <a@b.com>')?.name).toBeNull();
  });

  it('unescapes quoted names', () => {
    expect(parseFrom('"Tom \\"T\\" Lee" <t@l.com>')?.name).toBe('Tom "T" Lee');
  });

  it('decodes encoded names', () => {
    expect(parseFrom('=?UTF-8?B?w4lsb2RpZQ==?= <e@x.fr>')?.name).toBe('Élodie');
  });

  it('returns null when there is no address', () => {
    expect(parseFrom('undisclosed-recipients:;')).toBeNull();
    expect(parseFrom(undefined)).toBeNull();
  });
});

describe('decodeEncodedWords', () => {
  it('decodes base64 utf-8', () => {
    expect(decodeEncodedWords('=?UTF-8?B?SmFuZSDwn5iA?=')).toBe('Jane 😀');
  });

  it('decodes quoted-printable latin-1', () => {
    expect(decodeEncodedWords('=?ISO-8859-1?Q?Caf=E9_Bar?=')).toBe('Café Bar');
  });

  it('joins adjacent encoded words without the space between them', () => {
    expect(decodeEncodedWords('=?UTF-8?Q?Hello?= =?UTF-8?Q?_World?=')).toBe('Hello World');
  });

  it('leaves unknown charsets alone', () => {
    expect(decodeEncodedWords('=?x-nope?Q?hi?=')).toBe('=?x-nope?Q?hi?=');
  });
});

describe('parseListUnsubscribe', () => {
  it('finds both a link and a mailto', () => {
    expect(parseListUnsubscribe('<mailto:u@x.com?subject=stop>, <https://x.com/u?id=1>')).toEqual({
      url: 'https://x.com/u?id=1',
      mail: 'mailto:u@x.com?subject=stop',
    });
  });

  it('handles senders that skip the angle brackets', () => {
    expect(parseListUnsubscribe('https://x.com/u')).toEqual({ url: 'https://x.com/u', mail: null });
  });

  it('ignores junk and other schemes', () => {
    expect(parseListUnsubscribe('<not a url>, <javascript:alert(1)>')).toEqual({
      url: null,
      mail: null,
    });
    expect(parseListUnsubscribe(undefined)).toEqual({ url: null, mail: null });
  });
});

describe('isOneClick', () => {
  const https = { url: 'https://x.com/u', mail: null };

  it('needs an https link and the rfc 8058 post header', () => {
    expect(isOneClick(https, 'List-Unsubscribe=One-Click')).toBe(true);
    expect(isOneClick(https, ' list-unsubscribe = one-click ')).toBe(true);
  });

  it('is false without https or without the header', () => {
    expect(isOneClick({ url: 'http://x.com/u', mail: null }, 'List-Unsubscribe=One-Click')).toBe(
      false,
    );
    expect(isOneClick(https, undefined)).toBe(false);
    expect(isOneClick(https, 'something-else')).toBe(false);
  });
});
