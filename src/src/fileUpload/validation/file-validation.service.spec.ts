import { describe, it, expect } from 'bun:test';
import { FileValidationService } from './file-validation.service';

describe('FileValidationService', () => {
  it('FileValidationService가 정의되어 있어야 함', () => {
    const service = new FileValidationService();
    expect(service).toBeDefined();
    expect(service.validateFileSize).toBeDefined();
    expect(service.validateFileType).toBeDefined();
  });
});
