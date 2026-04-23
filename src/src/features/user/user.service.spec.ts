import { describe, it, expect, jest } from 'bun:test';
import { UserService } from './user.service';
import { DataSource } from 'typeorm';
import { CloudinaryService } from '../../fileUpload/cloudinary.service';

describe('UserService', () => {
  it('UserService가 정의되어 있어야 함', () => {
    const mockDataSource = {
      getRepository: jest.fn().mockReturnValue({
        find: jest.fn(),
        save: jest.fn(),
      }),
    } as unknown as DataSource;
    const mockCloudinaryService = {} as unknown as CloudinaryService;
    const service = new UserService(mockDataSource, mockCloudinaryService);
    expect(service).toBeDefined();
  });
});
