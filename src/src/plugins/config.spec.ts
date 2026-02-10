import { describe, it, expect } from 'bun:test';
import { configPlugin, env } from './config';

describe('Config Plugin (설정 플러그인)', () => {
  it('설정 플러그인 및 환경변수 객체가 정의되어 있어야 함', () => {
    expect(configPlugin).toBeDefined();
    expect(env).toBeDefined();
  });
});
