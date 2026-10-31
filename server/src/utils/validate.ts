import type { z } from 'zod';
import { badRequest } from './httpError';

// parses input with a zod schema, turning the first problem into a 400
export function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const issue = result.error.issues[0];
  const field = issue?.path.join('.');
  throw badRequest(field ? `${field}: ${issue.message}` : (issue?.message ?? 'invalid input'));
}
