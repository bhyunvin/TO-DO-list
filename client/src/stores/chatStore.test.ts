import { describe, test, expect } from 'bun:test';
import { useChatStore } from './chatStore';

describe('chatStore', () => {
  test('useChatStore가 정의되어 있어야 함', () => {
    expect(useChatStore).toBeDefined();
    const state = useChatStore.getState();
    expect(state).toHaveProperty('messages');
    expect(state).toHaveProperty('isLoading');
    expect(typeof state.addMessage).toBe('function');
    expect(typeof state.clearMessages).toBe('function');
  });
});
