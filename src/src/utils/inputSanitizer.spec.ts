import { InputSanitizerService } from './inputSanitizer';

describe('InputSanitizerService', () => {
  let service: InputSanitizerService;

  beforeEach(() => {
    service = new InputSanitizerService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sanitizeString', () => {
    it('should remove HTML tags by default', () => {
      const input = '<script>alert("xss")</script>Hello World';
      const result = service.sanitizeString(input);
      expect(result).toBe('alert(xss)Hello World');
    });

    it('should remove dangerous characters', () => {
      const input = 'Hello"World\'Test;DROP';
      const result = service.sanitizeString(input);
      expect(result).toBe('HelloWorldTestDROP');
    });

    it('should trim whitespace by default', () => {
      const input = '  Hello World  ';
      const result = service.sanitizeString(input);
      expect(result).toBe('Hello World');
    });
  });

  describe('sanitizeEmail', () => {
    it('should convert to lowercase', () => {
      const input = 'TEST@EXAMPLE.COM';
      const result = service.sanitizeEmail(input);
      expect(result).toBe('test@example.com');
    });

    it('should remove dangerous characters', () => {
      const input = 'test"@example.com';
      const result = service.sanitizeEmail(input);
      expect(result).toBe('test@example.com');
    });
  });

  describe('sanitizeName', () => {
    it('should allow valid name characters', () => {
      const input = "John O'Connor-Smith Jr.";
      const result = service.sanitizeName(input);
      expect(result).toBe("John O'Connor-Smith Jr.");
    });

    it('should remove invalid characters', () => {
      const input = 'John<script>alert("xss")</script>Doe';
      const result = service.sanitizeName(input);
      expect(result).toBe('JohnscriptalertxssscriptDoe');
    });
  });
});
