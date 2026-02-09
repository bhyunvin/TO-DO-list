import { describe, it, expect, beforeEach } from 'bun:test';
import { InputSanitizerService } from './inputSanitizer';

describe('InputSanitizerService (입력 정제 서비스)', () => {
  let service: InputSanitizerService;

  beforeEach(() => {
    service = new InputSanitizerService();
  });

  it('정의되어야 함', () => {
    expect(service).toBeDefined();
  });

  describe('sanitizeString (문자열 정제)', () => {
    it('기본적으로 HTML 태그를 제거해야 함', () => {
      const input = '<script>alert("xss")</script>Hello World';
      const result = service.sanitizeString(input);
      expect(result).toBe('alert("xss")Hello World');
    });

    it('위험한 문자를 제거해야 함', () => {
      const input = 'Hello"World\'Test;DROP';
      const result = service.sanitizeString(input);
      expect(result).toBe('Hello"World\'Test;DROP');
    });

    it('기본적으로 공백을 제거해야 함', () => {
      const input = '  Hello World  ';
      const result = service.sanitizeString(input);
      expect(result).toBe('Hello World');
    });
  });

  describe('sanitizeEmail (이메일 정제)', () => {
    it('소문자로 변환해야 함', () => {
      const input = 'TEST@EXAMPLE.COM';
      const result = service.sanitizeEmail(input);
      expect(result).toBe('test@example.com');
    });

    it('위험한 문자를 제거해야 함', () => {
      const input = 'test"@example.com';
      const result = service.sanitizeEmail(input);
      expect(result).toBe('test@example.com');
    });
  });

  describe('sanitizeName (이름 정제)', () => {
    it('유효한 이름 문자를 허용해야 함', () => {
      const input = "John O'Connor-Smith Jr.";
      const result = service.sanitizeName(input);
      expect(result).toBe("John O'Connor-Smith Jr.");
    });

    it('유효하지 않은 문자를 제거해야 함', () => {
      const input = 'John<script>alert("xss")</script>Doe';
      const result = service.sanitizeName(input);
      expect(result).toBe('JohnscriptalertxssscriptDoe');
    });
  });
});
