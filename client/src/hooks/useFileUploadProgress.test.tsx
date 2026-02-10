import { renderHook } from '@testing-library/react';
import { describe, test, expect } from 'bun:test';
import { useFileUploadProgress } from './useFileUploadProgress';

describe('useFileUploadProgress 훅', () => {
  test('훅이 정상적으로 초기화되어야 함', () => {
    const { result } = renderHook(() => useFileUploadProgress());
    expect(result.current).toHaveProperty('uploadProgress');
    expect(result.current).toHaveProperty('uploadStatus');
  });
});
