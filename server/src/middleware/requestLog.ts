import type { IncomingMessage } from 'node:http';
import morgan from 'morgan';

// query strings stay out of the logs: the oauth callback carries google's
// authorization code and state there, and search terms are the user's business
morgan.token('path', (req: IncomingMessage & { originalUrl?: string }) => {
  const url = req.originalUrl ?? req.url ?? '';
  return url.split('?')[0];
});

const FORMAT = ':method :path :status :res[content-length] - :response-time ms';

export function requestLog(stream: { write(line: string): void } = process.stdout) {
  return morgan(FORMAT, { stream });
}
