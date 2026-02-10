import { renderHook } from '@testing-library/react';
import { describe, test, expect } from 'bun:test';
import { useTodoFileHandler } from './useTodoFileHandler';

describe('useTodoFileHandler 훅', () => {
  test('훅이 정상적으로 초기화되어야 함', () => {
    const { result } = renderHook(() => useTodoFileHandler());
    expect(typeof result.current.handleFileChange).toBe('function');
  });
});
