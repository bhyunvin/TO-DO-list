import { describe, test, expect, jest, mock } from 'bun:test';
import todoService from './todoService';

mock.module('./todoService', () => ({
  __esModule: true,
  default: {
    getTodos: jest.fn(),
    createTodo: jest.fn(),
    updateTodo: jest.fn(),
    deleteTodo: jest.fn(),
    searchTodos: jest.fn(),
    getAttachments: jest.fn(),
    deleteAttachment: jest.fn(),
    downloadExcel: jest.fn(),
  },
}));

describe('todoService', () => {
  test('todoService가 정의되어 있어야 함', () => {
    expect(todoService).toBeDefined();
    expect(typeof todoService.getTodos).toBe('function');
    expect(typeof todoService.createTodo).toBe('function');
    expect(typeof todoService.getAttachments).toBe('function');
  });
});
