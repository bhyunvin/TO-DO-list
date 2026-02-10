import { describe, it, expect } from 'bun:test';
import { MailService } from './mail.service';

describe('MailService', () => {
  it('MailService가 정의되어 있어야 함', () => {
    const service = new MailService();
    expect(service).toBeDefined();
    expect(service.sendContactEmail).toBeDefined();
  });
});
