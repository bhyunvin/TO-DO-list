import { describe, it, expect, mock } from 'bun:test';
import { MailService } from './mail.service';

mock.module('nodemailer', () => ({
  createTransport: mock(() => ({
    sendMail: mock(() => Promise.resolve()),
  })),
}));

describe('MailService', () => {
  it('MailService가 정의되어 있어야 함', () => {
    const service = new MailService();
    expect(service).toBeDefined();
    expect(service.sendContactEmail).toBeDefined();
  });
});
