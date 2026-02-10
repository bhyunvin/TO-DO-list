import { renderHook } from '@testing-library/react';
import { describe, test, expect } from 'bun:test';
import { useBodyScrollLock } from './useBodyScrollLock';

describe('useBodyScrollLock 훅', () => {
  test('훅이 정상적으로 호출되어야 함', () => {
    const { unmount } = renderHook(() => useBodyScrollLock(true));
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
