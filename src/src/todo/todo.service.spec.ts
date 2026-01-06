import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TodoService } from './todo.service';
import { TodoEntity } from './todo.entity';
import { FileInfoEntity } from '../fileUpload/file.entity';
import { FileUploadUtil } from '../fileUpload/fileUploadUtil';
import * as ExcelJS from 'exceljs';

describe('TodoService - Excel Export', () => {
  let service: TodoService;

  const mockTodoRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockFileInfoRepository = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockFileUploadUtil = {
    saveFileInfo: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TodoService,
        {
          provide: getRepositoryToken(TodoEntity),
          useValue: mockTodoRepository,
        },
        {
          provide: getRepositoryToken(FileInfoEntity),
          useValue: mockFileInfoRepository,
        },
        {
          provide: FileUploadUtil,
          useValue: mockFileUploadUtil,
        },
      ],
    }).compile();

    service = module.get<TodoService>(TodoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportToExcel', () => {
    const userSeq = 1;
    const startDate = '2024-01-01';
    const endDate = '2024-01-31';

    it('유효한 데이터로 엑셀 파일을 생성해야 함', async () => {
      const mockTodos: TodoEntity[] = [
        {
          todoSeq: 1,
          userSeq: 1,
          todoContent: 'Test Todo 1',
          todoDate: '2024-01-15',
          completeDtm: '2024-01-15 10:30:00',
          todoNote: 'Test Note 1',
          todoFileGroupNo: null,
          delYn: 'N',
          auditColumns: {
            regId: 'testuser',
            regDtm: new Date(),
            updId: 'testuser',
            updDtm: new Date(),
            regIp: '127.0.0.1',
            updIp: '127.0.0.1',
          },
        },
        {
          todoSeq: 2,
          userSeq: 1,
          todoContent: 'Test Todo 2',
          todoDate: '2024-01-20',
          completeDtm: null,
          todoNote: null,
          todoFileGroupNo: null,
          delYn: 'N',
          auditColumns: {
            regId: 'testuser',
            regDtm: new Date(),
            updId: 'testuser',
            updDtm: new Date(),
            regIp: '127.0.0.1',
            updIp: '127.0.0.1',
          },
        },
      ];

      mockTodoRepository.find.mockResolvedValue(mockTodos);

      const buffer = await service.exportToExcel(userSeq, startDate, endDate);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(mockTodoRepository.find).toHaveBeenCalledWith({
        where: {
          userSeq,
          todoDate: expect.any(Object),
          delYn: 'N',
        },
        order: {
          todoDate: 'ASC',
          todoSeq: 'ASC',
        },
      });

      // 엑셀 내용 확인
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);
      const worksheet = workbook.getWorksheet('Todos');

      expect(worksheet).toBeDefined();
      expect(worksheet.getColumn('A').width).toBe(4);
      expect(worksheet.getColumn('B').width).toBe(6);
      expect(worksheet.getColumn('C').width).toBe(80);
      expect(worksheet.getColumn('D').width).toBe(17);
      expect(worksheet.getColumn('E').width).toBe(90);

      // 헤더 확인
      expect(worksheet.getRow(2).getCell('B').value).toBe('번호');
      expect(worksheet.getRow(2).getCell('C').value).toBe('내용');
      expect(worksheet.getRow(2).getCell('D').value).toBe('완료일시');
      expect(worksheet.getRow(2).getCell('E').value).toBe('비고');

      // 데이터 행 확인
      expect(worksheet.getRow(3).getCell('B').value).toBe(1);
      expect(worksheet.getRow(3).getCell('C').value).toBe('Test Todo 1');
      expect(worksheet.getRow(3).getCell('D').value).toBe('2024-01-15 10:30');
      expect(worksheet.getRow(3).getCell('E').value).toBe('Test Note 1');

      expect(worksheet.getRow(4).getCell('B').value).toBe(2);
      expect(worksheet.getRow(4).getCell('C').value).toBe('Test Todo 2');
      expect(worksheet.getRow(4).getCell('D').value).toBe('');
      expect(worksheet.getRow(4).getCell('E').value).toBe('');
    });

    it('빈 결과 집합을 처리해야 함', async () => {
      mockTodoRepository.find.mockResolvedValue([]);

      const buffer = await service.exportToExcel(userSeq, startDate, endDate);

      expect(buffer).toBeInstanceOf(Buffer);

      // 엑셀에 헤더는 있지만 데이터 행이 없는지 확인
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);
      const worksheet = workbook.getWorksheet('Todos');

      expect(worksheet).toBeDefined();
      expect(worksheet.getRow(2).getCell('B').value).toBe('번호');
      expect(worksheet.getRow(3).getCell('B').value).toBeNull();
    });

    it('날짜 범위로 정확하게 필터링해야 함', async () => {
      mockTodoRepository.find.mockResolvedValue([]);

      await service.exportToExcel(userSeq, startDate, endDate);

      expect(mockTodoRepository.find).toHaveBeenCalledWith({
        where: {
          userSeq,
          todoDate: expect.objectContaining({
            _type: 'between',
            _value: [startDate, endDate],
          }),
          delYn: 'N',
        },
        order: {
          todoDate: 'ASC',
          todoSeq: 'ASC',
        },
      });
    });

    it('delYn = N으로 필터링해야 함', async () => {
      mockTodoRepository.find.mockResolvedValue([]);

      await service.exportToExcel(userSeq, startDate, endDate);

      expect(mockTodoRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            delYn: 'N',
          }),
        }),
      );
    });

    it('completeDtm을 YYYY-MM-DD HH:mm으로 포맷해야 함', async () => {
      const mockTodos: TodoEntity[] = [
        {
          todoSeq: 1,
          userSeq: 1,
          todoContent: 'Test Todo',
          todoDate: '2024-01-15',
          completeDtm: '2024-01-15 14:30:45',
          todoNote: 'Note',
          todoFileGroupNo: null,
          delYn: 'N',
          auditColumns: {
            regId: 'testuser',
            regDtm: new Date(),
            updId: 'testuser',
            updDtm: new Date(),
            regIp: '127.0.0.1',
            updIp: '127.0.0.1',
          },
        },
      ];

      mockTodoRepository.find.mockResolvedValue(mockTodos);

      const buffer = await service.exportToExcel(userSeq, startDate, endDate);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);
      const worksheet = workbook.getWorksheet('Todos');

      const completeDtmValue = worksheet.getRow(3).getCell('D').value;
      expect(completeDtmValue).toBe('2024-01-15 14:30');
    });

    it('null인 completeDtm을 처리해야 함', async () => {
      const mockTodos: TodoEntity[] = [
        {
          todoSeq: 1,
          userSeq: 1,
          todoContent: 'Test Todo',
          todoDate: '2024-01-15',
          completeDtm: null,
          todoNote: 'Note',
          todoFileGroupNo: null,
          delYn: 'N',
          auditColumns: {
            regId: 'testuser',
            regDtm: new Date(),
            updId: 'testuser',
            updDtm: new Date(),
            regIp: '127.0.0.1',
            updIp: '127.0.0.1',
          },
        },
      ];

      mockTodoRepository.find.mockResolvedValue(mockTodos);

      const buffer = await service.exportToExcel(userSeq, startDate, endDate);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);
      const worksheet = workbook.getWorksheet('Todos');

      expect(worksheet.getRow(3).getCell('D').value).toBe('');
    });

    it('null인 todoNote를 처리해야 함', async () => {
      const mockTodos: TodoEntity[] = [
        {
          todoSeq: 1,
          userSeq: 1,
          todoContent: 'Test Todo',
          todoDate: '2024-01-15',
          completeDtm: '2024-01-15 10:30:00',
          todoNote: null,
          todoFileGroupNo: null,
          delYn: 'N',
          auditColumns: {
            regId: 'testuser',
            regDtm: new Date(),
            updId: 'testuser',
            updDtm: new Date(),
            regIp: '127.0.0.1',
            updIp: '127.0.0.1',
          },
        },
      ];

      mockTodoRepository.find.mockResolvedValue(mockTodos);

      const buffer = await service.exportToExcel(userSeq, startDate, endDate);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);
      const worksheet = workbook.getWorksheet('Todos');

      expect(worksheet.getRow(3).getCell('E').value).toBe('');
    });

    it('startDate가 누락되었을 때 에러를 발생시켜야 함', async () => {
      await expect(service.exportToExcel(userSeq, '', endDate)).rejects.toThrow(
        'startDate and endDate are required',
      );
    });

    it('endDate가 누락되었을 때 에러를 발생시켜야 함', async () => {
      await expect(
        service.exportToExcel(userSeq, startDate, ''),
      ).rejects.toThrow('startDate and endDate are required');
    });

    it('유효하지 않은 날짜 형식에 대해 에러를 발생시켜야 함', async () => {
      await expect(
        service.exportToExcel(userSeq, '2024/01/01', endDate),
      ).rejects.toThrow('Invalid date format. Use YYYY-MM-DD');

      await expect(
        service.exportToExcel(userSeq, startDate, '01-31-2024'),
      ).rejects.toThrow('Invalid date format. Use YYYY-MM-DD');
    });

    it('헤더 스타일을 올바르게 적용해야 함', async () => {
      mockTodoRepository.find.mockResolvedValue([]);

      const buffer = await service.exportToExcel(userSeq, startDate, endDate);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);
      const worksheet = workbook.getWorksheet('Todos');

      const headerRow = worksheet.getRow(2);
      const cellB = headerRow.getCell('B');

      expect(cellB.fill).toEqual({
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' },
      });
      expect(cellB.border).toBeDefined();
      expect(cellB.font?.bold).toBe(true);
      expect(cellB.alignment?.horizontal).toBe('center');
    });

    it('행 높이를 올바르게 설정해야 함', async () => {
      mockTodoRepository.find.mockResolvedValue([]);

      const buffer = await service.exportToExcel(userSeq, startDate, endDate);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);
      const worksheet = workbook.getWorksheet('Todos');

      expect(worksheet.getRow(1).height).toBe(15);
      expect(worksheet.getRow(2).height).toBe(15);
    });
  });
});
