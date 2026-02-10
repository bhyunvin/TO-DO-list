import { describe, it, expect } from 'bun:test';
import { databasePlugin, dataSource } from './database';

describe('Database Plugin (데이터베이스 플러그인)', () => {
  it('데이터베이스 플러그인이 정의되어 있어야 함', () => {
    expect(databasePlugin).toBeDefined();
    expect(dataSource).toBeDefined();
  });
});
