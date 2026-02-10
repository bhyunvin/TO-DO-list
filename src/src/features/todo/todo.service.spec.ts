import { describe, it, expect, jest } from 'bun:test';
import { TodoService } from './todo.service';

describe('TodoService (투두 관리 서비스)', () => {
  it('서비스가 정의되어 있어야 함', () => {
    const mockDataSource = {
      getRepository: jest.fn().mockReturnValue({
        find: jest.fn(),
        save: jest.fn(),
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        }),
      }),
    } as any;
    const mockCloudinaryService = {} as any;
    const service = new TodoService(mockDataSource, mockCloudinaryService);
    expect(service).toBeDefined();
  });

  it('CRUD 메소드들이 존재해야 함', () => {
    const mockDataSource = {
      getRepository: jest.fn().mockReturnValue({
        find: jest.fn(),
        save: jest.fn(),
      }),
    } as any;
    const mockCloudinaryService = {} as any;
    const service = new TodoService(mockDataSource, mockCloudinaryService);
    expect(service.findAll).toBeDefined();
    expect(service.create).toBeDefined();
    expect(service.update).toBeDefined();
    expect(service.delete).toBeDefined();
  });
});
