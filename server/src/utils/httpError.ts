export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'HttpError';
  }
}

export const notFound = (msg = 'not found') => new HttpError(404, msg);
export const unauthorized = (msg = 'unauthorized') => new HttpError(401, msg);
export const badRequest = (msg = 'bad request') => new HttpError(400, msg);
