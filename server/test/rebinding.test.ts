import { createServer, type AddressInfo, type LookupFunction } from 'node:net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { publicLookup } from '../src/lib/publicUrl';
import { sendOneClickUnsubscribe } from '../src/services/unsubscribe';

// the up-front check gets a public answer, like a rebinding dns server's first reply.
// the socket's own lookup then sees where the name really points: localhost
vi.mock('node:dns/promises', () => ({
  lookup: vi.fn().mockResolvedValue([{ address: '93.184.215.14', family: 4 }]),
}));

let connections = 0;
const server = createServer((socket) => {
  connections++;
  socket.destroy();
});

beforeAll(() => new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve)));
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

function resolveWith(lookup: LookupFunction, host: string, all: boolean) {
  return new Promise<unknown>((resolve, reject) => {
    lookup(host, { all }, (err, address) => (err ? reject(err) : resolve(address)));
  });
}

describe('dns rebinding', () => {
  it('refuses at connect time even after the up-front check passed', async () => {
    const { port } = server.address() as AddressInfo;

    await expect(sendOneClickUnsubscribe(`https://localhost:${port}/u`)).rejects.toMatchObject({
      status: 400,
    });
    expect(connections).toBe(0);
  });

  it('passes public addresses through in both lookup shapes', async () => {
    expect(await resolveWith(publicLookup, '93.184.215.14', false)).toBe('93.184.215.14');
    expect(await resolveWith(publicLookup, '93.184.215.14', true)).toEqual([
      { address: '93.184.215.14', family: 4 },
    ]);
  });
});
