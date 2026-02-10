import { describe, test, expect } from 'bun:test';
import * as dateUtils from './dateUtils';

describe('dateUtils', () => {
  test('유틸리티 함수들이 정의되어 있어야 함', () => {
    expect(dateUtils).toBeDefined();
  });
});
