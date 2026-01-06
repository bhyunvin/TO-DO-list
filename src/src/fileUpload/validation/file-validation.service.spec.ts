import { Test, TestingModule } from '@nestjs/testing';
import { FileValidationService } from './file-validation.service';
import {
  FILE_VALIDATION_ERRORS,
  FILE_VALIDATION_MESSAGES,
} from './file-validation.constants';

describe('FileValidationService', () => {
  let service: FileValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileValidationService],
    }).compile();

    service = module.get<FileValidationService>(FileValidationService);
  });

  it('정의되어야 함', () => {
    expect(service).toBeDefined();
  });

  describe('validateFileSize', () => {
    it('파일이 제한 크기 내일 때 검증을 통과해야 함', () => {
      const mockFile = {
        size: 5 * 1024 * 1024,
        originalname: 'test.jpg',
      } as Express.Multer.File;

      const result = service.validateFileSize(mockFile, 10 * 1024 * 1024);

      expect(result.isValid).toBe(true);
      expect(result.errorCode).toBeUndefined();
      expect(result.errorMessage).toBeUndefined();
    });

    it('파일이 제한 크기를 초과할 때 검증에 실패해야 함', () => {
      const mockFile = {
        size: 15 * 1024 * 1024,
        originalname: 'large-file.jpg',
      } as Express.Multer.File;

      const result = service.validateFileSize(mockFile, 10 * 1024 * 1024);

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(FILE_VALIDATION_ERRORS.FILE_TOO_LARGE);
      expect(result.errorMessage).toBe(
        FILE_VALIDATION_MESSAGES[FILE_VALIDATION_ERRORS.FILE_TOO_LARGE],
      );
    });

    it('크기가 0인 파일을 처리해야 함', () => {
      const mockFile = {
        size: 0,
        originalname: 'empty.txt',
      } as Express.Multer.File;

      const result = service.validateFileSize(mockFile, 10 * 1024 * 1024);

      expect(result.isValid).toBe(true);
    });
  });

  describe('validateFileType', () => {
    it('허용된 파일 형식일 때 검증을 통과해야 함', () => {
      const mockFile = {
        originalname: 'document.pdf',
        size: 1024,
      } as Express.Multer.File;

      const result = service.validateFileType(mockFile, ['.pdf', '.docx'], []);

      expect(result.isValid).toBe(true);
    });

    it('허용되지 않은 파일 형식일 때 검증에 실패해야 함', () => {
      const mockFile = {
        originalname: 'script.js',
        size: 1024,
      } as Express.Multer.File;

      const result = service.validateFileType(mockFile, ['.pdf', '.docx'], []);

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(FILE_VALIDATION_ERRORS.INVALID_FILE_TYPE);
    });

    it('차단된 파일 형식일 때 검증에 실패해야 함', () => {
      const mockFile = {
        originalname: 'malware.exe',
        size: 1024,
      } as Express.Multer.File;

      const result = service.validateFileType(
        mockFile,
        ['.exe', '.pdf'],
        ['.exe'],
      );

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(FILE_VALIDATION_ERRORS.BLOCKED_FILE_TYPE);
    });

    it('확장자가 없는 파일을 처리해야 함', () => {
      const mockFile = {
        originalname: 'README',
        size: 1024,
      } as Express.Multer.File;

      const result = service.validateFileType(mockFile, ['.txt'], []);

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(FILE_VALIDATION_ERRORS.INVALID_FILE_TYPE);
    });

    it('대소문자를 구분하지 않는 확장자를 처리해야 함', () => {
      const mockFile = {
        originalname: 'image.JPG',
        size: 1024,
      } as Express.Multer.File;

      const result = service.validateFileType(mockFile, ['.jpg', '.png'], []);

      expect(result.isValid).toBe(true);
    });

    it('허용 목록이 비어있을 때 차단되지 않은 파일은 통과해야 함', () => {
      const mockFile = {
        originalname: 'test.unknown',
        size: 1024,
      } as Express.Multer.File;

      const result = service.validateFileType(mockFile, [], ['.exe']);

      expect(result.isValid).toBe(true);
    });
  });

  describe('validateMultipleFiles', () => {
    it('여러 유효한 파일을 검증해야 함', () => {
      const mockFiles = [
        { originalname: 'doc1.pdf', size: 1024 },
        { originalname: 'doc2.docx', size: 2048 },
      ] as Express.Multer.File[];

      const config = {
        maxFileSize: 10 * 1024 * 1024,
        allowedExtensions: ['.pdf', '.docx'],
        blockedExtensions: ['.exe'],
        maxFileCount: 5,
      };

      const results = service.validateMultipleFiles(mockFiles, config);

      expect(results).toHaveLength(2);
      expect(results[0].isValid).toBe(true);
      expect(results[1].isValid).toBe(true);
    });

    it('파일 수가 제한을 초과할 때 검증에 실패해야 함', () => {
      const mockFiles = [
        { originalname: 'doc1.pdf', size: 1024 },
        { originalname: 'doc2.pdf', size: 1024 },
        { originalname: 'doc3.pdf', size: 1024 },
      ] as Express.Multer.File[];

      const config = {
        maxFileSize: 10 * 1024 * 1024,
        allowedExtensions: ['.pdf'],
        blockedExtensions: [],
        maxFileCount: 2,
      };

      const results = service.validateMultipleFiles(mockFiles, config);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.isValid).toBe(false);
        expect(result.errorCode).toBe(FILE_VALIDATION_ERRORS.TOO_MANY_FILES);
      });
    });

    it('유효한 파일과 유효하지 않은 파일이 섞여 있을 때 검증해야 함', () => {
      const mockFiles = [
        { originalname: 'valid.pdf', size: 1024 },
        { originalname: 'toolarge.pdf', size: 15 * 1024 * 1024 },
        { originalname: 'blocked.exe', size: 1024 },
      ] as Express.Multer.File[];

      const config = {
        maxFileSize: 10 * 1024 * 1024,
        allowedExtensions: ['.pdf', '.exe'],
        blockedExtensions: ['.exe'],
        maxFileCount: 5,
      };

      const results = service.validateMultipleFiles(mockFiles, config);

      expect(results).toHaveLength(3);
      expect(results[0].isValid).toBe(true);
      expect(results[1].isValid).toBe(false);
      expect(results[1].errorCode).toBe(FILE_VALIDATION_ERRORS.FILE_TOO_LARGE);
      expect(results[2].isValid).toBe(false);
      expect(results[2].errorCode).toBe(
        FILE_VALIDATION_ERRORS.BLOCKED_FILE_TYPE,
      );
    });
  });

  describe('validateFilesByCategory', () => {
    it('프로필 이미지 파일을 올바르게 검증해야 함', () => {
      const mockFiles = [
        { originalname: 'profile.jpg', size: 2 * 1024 * 1024 },
      ] as Express.Multer.File[];

      const results = service.validateFilesByCategory(
        mockFiles,
        'profile_image',
      );

      expect(results).toHaveLength(1);
      expect(results[0].isValid).toBe(true);
    });

    it('프로필 카테고리에서 이미지 외의 파일을 거부해야 함', () => {
      const mockFiles = [
        { originalname: 'document.pdf', size: 1024 },
      ] as Express.Multer.File[];

      const results = service.validateFilesByCategory(
        mockFiles,
        'profile_image',
      );

      expect(results).toHaveLength(1);
      expect(results[0].isValid).toBe(false);
      expect(results[0].errorCode).toBe(
        FILE_VALIDATION_ERRORS.INVALID_FILE_TYPE,
      );
    });

    it('할 일 첨부 파일을 올바르게 검증해야 함', () => {
      const mockFiles = [
        { originalname: 'document.pdf', size: 1024 },
        { originalname: 'spreadsheet.xlsx', size: 2048 },
      ] as Express.Multer.File[];

      const results = service.validateFilesByCategory(
        mockFiles,
        'todo_attachment',
      );

      expect(results).toHaveLength(2);
      expect(results[0].isValid).toBe(true);
      expect(results[1].isValid).toBe(true);
    });

    it('할 일 첨부 파일에서 차단된 파일을 거부해야 함', () => {
      const mockFiles = [
        { originalname: 'script.js', size: 1024 },
      ] as Express.Multer.File[];

      const results = service.validateFilesByCategory(
        mockFiles,
        'todo_attachment',
      );

      expect(results).toHaveLength(1);
      expect(results[0].isValid).toBe(false);
      expect(results[0].errorCode).toBe(
        FILE_VALIDATION_ERRORS.BLOCKED_FILE_TYPE,
      );
    });
  });

  describe('getValidationErrors', () => {
    it('실패한 검증에 대한 오류를 추출해야 함', () => {
      const mockFiles = [
        { originalname: 'valid.pdf', size: 1024 },
        { originalname: 'invalid.exe', size: 2048 },
      ] as Express.Multer.File[];

      const validationResults = [
        { isValid: true },
        {
          isValid: false,
          errorCode: FILE_VALIDATION_ERRORS.BLOCKED_FILE_TYPE,
          errorMessage: 'File type is blocked',
        },
      ];

      const errors = service.getValidationErrors(mockFiles, validationResults);

      expect(errors).toHaveLength(1);
      expect(errors[0].fileName).toBe('invalid.exe');
      expect(errors[0].errorCode).toBe(
        FILE_VALIDATION_ERRORS.BLOCKED_FILE_TYPE,
      );
      expect(errors[0].fileSize).toBe(2048);
      expect(errors[0].fileType).toBe('.exe');
    });

    it('모든 검증을 통과하면 빈 배열을 반환해야 함', () => {
      const mockFiles = [
        { originalname: 'valid1.pdf', size: 1024 },
        { originalname: 'valid2.docx', size: 2048 },
      ] as Express.Multer.File[];

      const validationResults = [{ isValid: true }, { isValid: true }];

      const errors = service.getValidationErrors(mockFiles, validationResults);

      expect(errors).toHaveLength(0);
    });
  });

  describe('getValidFiles', () => {
    it('유효한 파일만 반환해야 함', () => {
      const mockFiles = [
        { originalname: 'valid.pdf', size: 1024 },
        { originalname: 'invalid.exe', size: 2048 },
        { originalname: 'alsovalid.docx', size: 1536 },
      ] as Express.Multer.File[];

      const validationResults = [
        { isValid: true },
        { isValid: false, errorCode: 'BLOCKED_FILE_TYPE' },
        { isValid: true },
      ];

      const validFiles = service.getValidFiles(mockFiles, validationResults);

      expect(validFiles).toHaveLength(2);
      expect((validFiles[0] as Express.Multer.File).originalname).toBe(
        'valid.pdf',
      );
      expect((validFiles[1] as Express.Multer.File).originalname).toBe(
        'alsovalid.docx',
      );
    });

    it('유효한 파일이 없으면 빈 배열을 반환해야 함', () => {
      const mockFiles = [
        { originalname: 'invalid1.exe', size: 1024 },
        { originalname: 'invalid2.bat', size: 2048 },
      ] as Express.Multer.File[];

      const validationResults = [
        { isValid: false, errorCode: 'BLOCKED_FILE_TYPE' },
        { isValid: false, errorCode: 'BLOCKED_FILE_TYPE' },
      ];

      const validFiles = service.getValidFiles(mockFiles, validationResults);

      expect(validFiles).toHaveLength(0);
    });
  });

  describe('formatFileSize', () => {
    it('바이트를 올바르게 포맷팅해야 함', () => {
      expect(service.formatFileSize(0)).toBe('0 Bytes');
      expect(service.formatFileSize(1024)).toBe('1 KB');
      expect(service.formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(service.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('소수 값을 올바르게 포맷팅해야 함', () => {
      expect(service.formatFileSize(1536)).toBe('1.5 KB');
      expect(service.formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
    });
  });

  describe('isValidFileType', () => {
    it('허용된 파일 형식에 대해 true를 반환해야 함', () => {
      const result = service.isValidFileType(
        'document.pdf',
        ['.pdf', '.docx'],
        [],
      );
      expect(result).toBe(true);
    });

    it('차단된 파일 형식에 대해 false를 반환해야 함', () => {
      const result = service.isValidFileType(
        'script.exe',
        ['.exe', '.pdf'],
        ['.exe'],
      );
      expect(result).toBe(false);
    });

    it('허용되지 않은 파일 형식에 대해 false를 반환해야 함', () => {
      const result = service.isValidFileType(
        'image.jpg',
        ['.pdf', '.docx'],
        [],
      );
      expect(result).toBe(false);
    });

    it('대소문자를 구분하지 않는 확장자를 처리해야 함', () => {
      const result = service.isValidFileType('Document.PDF', ['.pdf'], []);
      expect(result).toBe(true);
    });
  });
});
