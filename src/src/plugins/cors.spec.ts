import { describe, it, expect } from 'bun:test';
import { corsPlugin } from './cors';

describe('CORS Plugin (CORS 플러그인)', () => {
  it('CORS 플러그인이 정의되어 있어야 함', () => {
    expect(corsPlugin).toBeDefined();
  });
});
