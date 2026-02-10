import { renderHook } from '@testing-library/react';
import { describe, test, expect } from 'bun:test';
import { useFileUploadValidator } from './useFileUploadValidator';

describe('useFileUploadValidator', () => {
  test('유효성 검사 함수들이 반환되어야 함', () => {
    const { result } = renderHook(() => useFileUploadValidator());
    expect(result.current.validateFiles).toBeDefined();
    expect(result.current.formatFileSize).toBeDefined();
  });
});
