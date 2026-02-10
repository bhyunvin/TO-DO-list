import { describe, it, expect } from 'bun:test';
import { swaggerPlugin } from './swagger';

describe('Swagger Plugin (Swagger 플러그인)', () => {
  it('Swagger 플러그인이 정의되어 있어야 함', () => {
    expect(swaggerPlugin).toBeDefined();
  });
});
