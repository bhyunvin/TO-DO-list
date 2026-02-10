import { describe, it, expect } from 'bun:test';
import { CloudinaryService } from './cloudinary.service';

describe('CloudinaryService', () => {
  it('CloudinaryService가 정의되어 있어야 함', () => {
    const service = new CloudinaryService();
    expect(service).toBeDefined();
    expect(service.uploadFile).toBeDefined();
    expect(service.deleteFile).toBeDefined();
  });
});
