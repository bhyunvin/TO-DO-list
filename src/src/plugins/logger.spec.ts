import { describe, it, expect } from 'bun:test';
import { loggerPlugin } from './logger';

describe('Logger Plugin (로거 플러그인)', () => {
  it('로거 플러그인이 정의되어 있어야 함', () => {
    expect(loggerPlugin).toBeDefined();
  });
});
