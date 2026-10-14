import { describe, it, expect } from 'bun:test';
import { getClientIp } from './ip.util';

describe('IpUtil (IP 유틸리티)', () => {
  it('x-forwarded-for 헤더가 있으면 첫 번째 IP를 반환해야 함', () => {
    const request = {
      headers: new Headers({
        'x-forwarded-for': 'first-client, second-proxy',
      }),
    } as Request;

    expect(getClientIp(request)).toBe('first-client');
  });

  it('x-forwarded-for 헤더가 없으면 기본 IP를 반환해야 함', () => {
    const request = {
      headers: new Headers({}),
    } as Request;

    expect(getClientIp(request)).toBe('127.0.0.1');
  });

  it('IP가 40자를 초과하면 잘라내야 함', () => {
    const longIp = 'a'.repeat(50);
    const request = {
      headers: new Headers({
        'x-forwarded-for': longIp,
      }),
    } as Request;

    expect(getClientIp(request)).toHaveLength(40);
    expect(getClientIp(request)).toBe('a'.repeat(40));
  });
});
