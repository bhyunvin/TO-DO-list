import { describe, test, expect } from 'bun:test';
import * as passwordUtils from './passwordUtils';

describe('passwordUtils', () => {
  test('유틸리티 함수들이 정의되어 있어야 함', () => {
    expect(passwordUtils).toBeDefined();
  });
});
