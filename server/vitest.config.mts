import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      // throwaway key so crypto works in tests; never used outside them
      TOKEN_ENCRYPTION_KEY: '0'.repeat(64),
      // dotenv never overrides set vars, so these keep a local .env out of the tests
      DATABASE_URL: '',
      GOOGLE_CLIENT_ID: '',
      GOOGLE_CLIENT_SECRET: '',
    },
  },
});
