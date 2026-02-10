import { describe, it, expect } from 'bun:test';
import { dbLoggingPlugin } from './db-logging';

describe('DB Logging Plugin (DB 로깅 플러그인)', () => {
  it('DB 로깅 플러그인이 정의되어 있어야 함', () => {
    expect(dbLoggingPlugin).toBeDefined();
  });
});
