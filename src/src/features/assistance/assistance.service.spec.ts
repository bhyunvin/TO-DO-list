import { describe, it, expect, jest } from 'bun:test';
import { AssistanceService } from './assistance.service';
import { DataSource } from 'typeorm';
import { TodoService } from '../todo/todo.service';

describe('AssistanceService', () => {
  it('AssistanceService가 정의되어 있어야 함', () => {
    const mockDataSource = {
      getRepository: jest.fn().mockReturnValue({
        find: jest.fn(),
        save: jest.fn(),
      }),
    } as unknown as DataSource;
    const mockTodoService = {} as unknown as TodoService;
    const service = new AssistanceService(mockDataSource, mockTodoService);
    expect(service).toBeDefined();
    expect(service.chatWithRetry).toBeDefined();
  });
});
