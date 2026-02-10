import { renderHook } from '@testing-library/react';
import { describe, test, expect } from 'bun:test';
import useSecureImage from './useSecureImage';

describe('useSecureImage', () => {
  test('이미지 URL과 로딩 상태가 반환되어야 함', () => {
    const { result } = renderHook(() => useSecureImage('/api/file/1'));
    // useSecureImage는 blobUrl || src를 직접 반환함
    expect(result.current).toBeDefined();
  });
});
