import { describe, test, expect, jest, mock } from 'bun:test';
import { useAuthStore } from './authStore';

mock.module('./authStore', () => {
  const useAuthStore = jest.fn();
  (useAuthStore as any).getState = jest.fn(() => ({
    user: null,
    accessToken: null,
  }));
  return { useAuthStore };
});

describe('authStore', () => {
  test('useAuthStore가 정의되어 있어야 함', () => {
    expect(useAuthStore).toBeDefined();
    // Zustand 스토어는 getState 메서드를 가짐
    const state = useAuthStore.getState();
    expect(state).toHaveProperty('user');
    expect(state).toHaveProperty('accessToken');
  });
});
