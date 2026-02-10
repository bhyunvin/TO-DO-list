import { describe, test, expect } from 'bun:test';
import aiService from './aiService';

describe('aiService', () => {
  test('aiService가 정의되어 있어야 함', () => {
    expect(aiService).toBeDefined();
    expect(typeof aiService.chat).toBe('function');
  });
});
