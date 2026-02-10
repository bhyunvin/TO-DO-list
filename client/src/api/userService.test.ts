import { describe, test, expect } from 'bun:test';
import userService from './userService';

describe('userService', () => {
  test('userService가 정의되어 있어야 함', () => {
    expect(userService).toBeDefined();
  });

  test('핵심 메서드가 정의되어 있어야 함', () => {
    expect(userService.getProfile).toBeDefined();
    expect(userService.updateProfile).toBeDefined();
    expect(userService.changePassword).toBeDefined();
  });
});
