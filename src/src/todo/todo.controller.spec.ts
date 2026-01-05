import { Test, TestingModule } from '@nestjs/testing';
import { Response, Request } from 'express';
import { TodoController } from './todo.controller';
import { TodoService } from './todo.service';
import { FileUploadErrorService } from '../fileUpload/validation/file-upload-error.service';
import { FileValidationService } from '../fileUpload/validation/file-validation.service';
import { AuthenticatedGuard } from '../types/express/auth.guard';

describe('TodoController - Excel Export', () => {
  let controller: TodoController;
  let todoService: TodoService;

  const mockTodoService = {
    exportToExcel: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    uploadAttachments: jest.fn(),
    createWithFiles: jest.fn(),
    addAttachments: jest.fn(),
    getAttachments: jest.fn(),
  };

  const mockFileUploadErrorService = {
    extractErrorContext: jest.fn(),
    logSuccessfulUpload: jest.fn(),
    createSuccessResponse: jest.fn(),
  };

  const mockFileValidationService = {
    validateFilesByCategory: jest.fn(),
  };

  const mockUser = {
    userSeq: 1,
    userId: 'testuser',
    userName: 'Test User',
    userEmail: 'test@example.com',
  };

  // session 대신 request.user를 모킹
  const mockRequest = {
    user: mockUser,
  } as unknown as Request;

  const mockResponse = (): Response => {
    const res: Partial<Response> = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    return res as Response;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TodoController],
      providers: [
        {
          provide: TodoService,
          useValue: mockTodoService,
        },
        {
          provide: FileUploadErrorService,
          useValue: mockFileUploadErrorService,
        },
        {
          provide: FileValidationService,
          useValue: mockFileValidationService,
        },
      ],
    })
      .overrideGuard(AuthenticatedGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<TodoController>(TodoController);
    todoService = module.get<TodoService>(TodoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportToExcel', () => {
    const startDate = '2024-01-01';
    const endDate = '2024-01-31';

    it('should return Excel file with correct headers', async () => {
      const mockBuffer = Buffer.from('test excel data');
      mockTodoService.exportToExcel.mockResolvedValue(mockBuffer);

      const res = mockResponse();

      await controller.exportToExcel(mockRequest, startDate, endDate, res);

      expect(todoService.exportToExcel).toHaveBeenCalledWith(
        1,
        startDate,
        endDate,
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        `attachment; filename="todos_${startDate}_to_${endDate}.xlsx"`,
      );
      expect(res.send).toHaveBeenCalledWith(mockBuffer);
    });

    it('should enforce authentication guard', () => {
      // Verify that the AuthenticatedGuard is applied at the controller level
      // This is tested by checking that the guard decorator is present
      const guards = Reflect.getMetadata('__guards__', TodoController);
      expect(guards).toBeDefined();
      expect(guards).toEqual([AuthenticatedGuard]);
    });

    it('should handle missing startDate parameter', async () => {
      mockTodoService.exportToExcel.mockRejectedValue(
        new Error('startDate and endDate are required'),
      );

      const res = mockResponse();

      await expect(
        controller.exportToExcel(mockRequest, '', endDate, res),
      ).rejects.toThrow('startDate and endDate are required');

      expect(todoService.exportToExcel).toHaveBeenCalledWith(1, '', endDate);
    });

    it('should handle missing endDate parameter', async () => {
      mockTodoService.exportToExcel.mockRejectedValue(
        new Error('startDate and endDate are required'),
      );

      const res = mockResponse();

      await expect(
        controller.exportToExcel(mockRequest, startDate, '', res),
      ).rejects.toThrow('startDate and endDate are required');

      expect(todoService.exportToExcel).toHaveBeenCalledWith(1, startDate, '');
    });

    it('should handle invalid date format', async () => {
      mockTodoService.exportToExcel.mockRejectedValue(
        new Error('Invalid date format. Use YYYY-MM-DD'),
      );

      const res = mockResponse();

      await expect(
        controller.exportToExcel(mockRequest, '2024/01/01', endDate, res),
      ).rejects.toThrow('Invalid date format. Use YYYY-MM-DD');

      expect(todoService.exportToExcel).toHaveBeenCalledWith(
        1,
        '2024/01/01',
        endDate,
      );
    });

    it('should handle service errors', async () => {
      const errorMessage = 'Database connection failed';
      mockTodoService.exportToExcel.mockRejectedValue(new Error(errorMessage));

      const res = mockResponse();

      await expect(
        controller.exportToExcel(mockRequest, startDate, endDate, res),
      ).rejects.toThrow(errorMessage);

      expect(todoService.exportToExcel).toHaveBeenCalledWith(
        1,
        startDate,
        endDate,
      );
    });

    it('should extract userSeq from request.user', async () => {
      const mockBuffer = Buffer.from('test excel data');
      mockTodoService.exportToExcel.mockResolvedValue(mockBuffer);

      const customRequest = {
        user: {
          userSeq: 999,
          userId: 'anotheruser',
          userName: 'Another User',
          userEmail: 'another@example.com',
        },
      } as unknown as Request;

      const res = mockResponse();

      await controller.exportToExcel(customRequest, startDate, endDate, res);

      expect(todoService.exportToExcel).toHaveBeenCalledWith(
        999,
        startDate,
        endDate,
      );
    });

    it('should set correct filename in Content-Disposition header', async () => {
      const mockBuffer = Buffer.from('test excel data');
      mockTodoService.exportToExcel.mockResolvedValue(mockBuffer);

      const customStartDate = '2024-03-15';
      const customEndDate = '2024-03-31';

      const res = mockResponse();

      await controller.exportToExcel(
        mockRequest,
        customStartDate,
        customEndDate,
        res,
      );

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        `attachment; filename="todos_${customStartDate}_to_${customEndDate}.xlsx"`,
      );
    });

    it('should send buffer as response', async () => {
      const mockBuffer = Buffer.from('excel file content');
      mockTodoService.exportToExcel.mockResolvedValue(mockBuffer);

      const res = mockResponse();

      await controller.exportToExcel(mockRequest, startDate, endDate, res);

      expect(res.send).toHaveBeenCalledWith(mockBuffer);
      expect(res.send).toHaveBeenCalledTimes(1);
    });
  });
});
