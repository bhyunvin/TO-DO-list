import { describe, it, expect, mock } from 'bun:test';
import { CloudinaryService } from './cloudinary.service';

mock.module('cloudinary', () => ({
  v2: {
    config: mock(() => {}),
    uploader: {
      upload_stream: mock(() => {}),
      destroy: mock(() => Promise.resolve()),
    },
  },
}));

describe('CloudinaryService', () => {
  it('CloudinaryService가 정의되어 있어야 함', () => {
    const service = new CloudinaryService();
    expect(service).toBeDefined();
    expect(service.uploadFile).toBeDefined();
    expect(service.deleteFile).toBeDefined();
  });
});
