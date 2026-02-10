import { describe, test, expect } from 'bun:test';
import * as alertUtils from './alertUtils';

describe('alertUtils', () => {
  test('유틸리티 함수들이 정의되어 있어야 함', () => {
    expect(alertUtils).toBeDefined();
  });
});
