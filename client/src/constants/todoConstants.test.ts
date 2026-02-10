import { describe, test, expect } from 'bun:test';
import { TODO_CONSTANTS } from './todoConstants';

describe('todoConstants', () => {
  test('상수들이 정의되어 있어야 함', () => {
    expect(TODO_CONSTANTS).toBeDefined();
    expect(TODO_CONSTANTS.MAX_CONTENT_LENGTH).toBeDefined();
  });
});
