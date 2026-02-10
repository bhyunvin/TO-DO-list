import { describe, test, expect } from 'bun:test';
import authService from './authService';

describe('authService', () => {
  test('authService가 정의되어 있어야 함', () => {
    expect(authService).toBeDefined();
  });

  test('핵심 메서드가 정의되어 있어야 함', () => {
    expect(authService.login).toBeDefined();
    expect(authService.logout).toBeDefined();
    expect(authService.signup).toBeDefined();
    expect(authService.checkDuplicateId).toBeDefined();
  });
});
