import { describe, test, expect, it } from 'bun:test';
import { api, ApiError } from './client';

describe('api client', () => {
  test('api 인스턴스가 정의되어 있어야 함', () => {
    expect(api).toBeDefined();
  });

  it('ApiError 상속 및 속성 확인', () => {
    const error = new ApiError('Test error', 400, { detail: 'error data' });
    expect(error.message).toBe('Test error');
    expect(error.response.status).toBe(400);
  });
});
