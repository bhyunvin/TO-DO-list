import { describe, it, expect } from 'bun:test';
import { jwtPlugin } from './jwt';

describe('JWT Plugin (JWT 플러그인)', () => {
  it('JWT 플러그인이 정의되어 있어야 함', () => {
    expect(jwtPlugin).toBeDefined();
  });
});
