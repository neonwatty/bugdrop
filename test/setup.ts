import { beforeAll } from 'vitest';

beforeAll(() => {
  // Setup global test environment
  process.env.NODE_ENV = 'test';
});
