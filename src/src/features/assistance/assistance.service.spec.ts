import { describe, it, expect, jest } from 'bun:test';
import { AssistanceService } from './assistance.service';

describe('AssistanceService', () => {
  it('AssistanceService가 정의되어 있어야 함', () => {
    const mockDataSource = {
      getRepository: jest.fn().mockReturnValue({
        find: jest.fn(),
        save: jest.fn(),
      }),
    } as any;
    const mockTodoService = {} as any;
    const service = new AssistanceService(mockDataSource, mockTodoService);
    expect(service).toBeDefined();
    expect(service.chatWithRetry).toBeDefined();
  });
});
