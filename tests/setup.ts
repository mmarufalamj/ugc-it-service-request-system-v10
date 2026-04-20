import { expect, afterEach, vi } from 'vitest';

// Mock fetch globally for unit tests
global.fetch = vi.fn();

afterEach(() => {
  vi.clearAllMocks();
});
