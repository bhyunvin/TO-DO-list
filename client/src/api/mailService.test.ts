import { describe, test, expect } from 'bun:test';
import mailService from './mailService';

describe('mailService', () => {
  test('mailService가 정의되어 있어야 함', () => {
    expect(mailService).toBeDefined();
  });

  test('핵심 메서드가 정의되어 있어야 함', () => {
    expect(mailService.sendContactEmail).toBeDefined();
  });
});
