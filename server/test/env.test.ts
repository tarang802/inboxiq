import { describe, expect, it } from 'vitest';
import { productionProblems, type Env } from '../src/config/env';

const good: Env = {
  NODE_ENV: 'production',
  PORT: 4000,
  CLIENT_URL: 'https://sieve.example.com',
  TRUST_PROXY: 1,
  CLIENT_DIST: '../client/dist',
  DATABASE_URL: 'postgres://u:p@db.example.com/sieve',
  GOOGLE_CLIENT_ID: 'id',
  GOOGLE_CLIENT_SECRET: 'secret',
  GOOGLE_REDIRECT_URI: 'https://sieve.example.com/api/auth/google/callback',
  GMAIL_UNITS_PER_MINUTE: 6000,
  TOKEN_ENCRYPTION_KEY: 'a'.repeat(64),
};

const built = () => true;

describe('productionProblems', () => {
  it('passes a complete config', () => {
    expect(productionProblems(good, built)).toEqual([]);
  });

  it('names every missing secret', () => {
    const problems = productionProblems(
      {
        ...good,
        DATABASE_URL: undefined,
        GOOGLE_CLIENT_ID: '',
        GOOGLE_CLIENT_SECRET: undefined,
      },
      built,
    );
    expect(problems).toEqual([
      'DATABASE_URL is not set',
      'GOOGLE_CLIENT_ID is not set',
      'GOOGLE_CLIENT_SECRET is not set',
    ]);
  });

  it('rejects a key that is not 64 hex characters', () => {
    expect(productionProblems({ ...good, TOKEN_ENCRYPTION_KEY: 'too-short' }, built)).toEqual([
      'TOKEN_ENCRYPTION_KEY must be 64 hex characters',
    ]);
  });

  it('wants https', () => {
    const problems = productionProblems(
      {
        ...good,
        CLIENT_URL: 'http://sieve.example.com',
        GOOGLE_REDIRECT_URI: 'http://sieve.example.com/api/auth/google/callback',
      },
      built,
    );
    expect(problems).toContain('CLIENT_URL must use https');
  });

  it('catches a redirect uri that does not match the app', () => {
    const problems = productionProblems(
      { ...good, GOOGLE_REDIRECT_URI: 'https://sieve.example.com/auth/google/callback' },
      built,
    );
    expect(problems).toEqual([
      'GOOGLE_REDIRECT_URI should be https://sieve.example.com/api/auth/google/callback',
    ]);
  });

  it('notices a missing client build', () => {
    expect(productionProblems(good, () => false)).toEqual([
      'CLIENT_DIST has no index.html. was the client built?',
    ]);
  });

  it('never puts secret values in the messages', () => {
    const problems = productionProblems(
      { ...good, TOKEN_ENCRYPTION_KEY: 'not-hex-secret-value' },
      built,
    ).join(' ');
    expect(problems).not.toContain('not-hex-secret-value');
  });
});
