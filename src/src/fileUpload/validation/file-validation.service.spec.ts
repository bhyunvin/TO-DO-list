import { Test, TestingModule } from '@nestjs/testing';
import { FileValidationService } from './file-validation.service';
import {
  FILE_VALIDATION_ERRORS,
  FILE_VALIDATION_MESSAGES,
  FILE_UPLOAD_POLICY,
  BLOCKED_EXTENSIONS,
} from './file-validation.constants';

describe('FileValidationService', () => {
  let service: FileValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileValidationService],
    }).compile();

    service = module.get<FileValidationService>(FileValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateFileSize', () => {
    it('should pass validation for file within size limit', () => {
      const mockFile = {
        size: 5 * 1024 * 1024, // 5MB
        originalname: 'test.jpg',
      } as Express.Multer.File;

      const result = service.validateFileSize(mockFile, 10 * 1024 * 1024); // 10MB limit

      expect(result.isValid).toBe(true);
      expect(result.errorCode).toBeUndefined();
      expect(result.errorMessage).toBeUndefined();
    });

    it('should fail validation for file exceeding size limit', () => {
      const mockFile = {
        size: 15 * 1024 * 1024, // 15MB
        originalname: 'large-file.jpg',
      } as Express.Multer.File;

      const result = service.validateFileSize(mockFile, 10 * 1024 * 1024); // 10MB limit

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(FILE_VALIDATION_ERRORS.FILE_TOO_LARGE);
      expect(result.errorMessage).toBe(
        FILE_VALIDATION_MESSAGES[FILE_VALIDATION_ERRORS.FILE_TOO_LARGE],
      );
    });

    it('should handle zero-size files', () => {
      const mockFile = {
        size: 0,
        originalname: 'empty.txt',
      } as Express.Multer.File;

      const result = service.validateFileSize(mockFile, 10 * 1024 * 1024);

      expect(result.isValid).toBe(true);
    });
  });

  describe('validateFileType', () => {
    it('should pass validation for allowed file type', () => {
      const mockFile = {
        originalname: 'document.pdf',
        size: 1024,
      } as Express.Multer.File;

      const result = service.validateFileType(mockFile, ['.pdf', '.docx'], []);

      expect(result.isValid).toBe(true);
    });

    it('should fail validation for disallowed file type', () => {
      const mockFile = {
        originalname: 'script.js',
        size: 1024,
      } as Express.Multer.File;

      const result = service.validateFileType(mockFile, ['.pdf', '.docx'], []);

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(FILE_VALIDATION_ERRORS.INVALID_FILE_TYPE);
    });

    it('should fail validation for blocked file type', () => {
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

    it('should handle files without extensions', () => {
      const mockFile = {
        originalname: 'README',
        size: 1024,
      } as Express.Multer.File;

      const result = service.validateFileType(mockFile, ['.txt'], []);

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(FILE_VALIDATION_ERRORS.INVALID_FILE_TYPE);
    });

    it('should handle case-insensitive extensions', () => {
      const mockFile = {
        originalname: 'image.JPG',
        size: 1024,
      } as Express.Multer.File;

      const result = service.validateFileType(mockFile, ['.jpg', '.png'], []);

      expect(result.isValid).toBe(true);
    });
  });

  describe('validateMultipleFiles', () => {
    it('should validate multiple valid files', () => {
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

    it('should fail validation when file count exceeds limit', () => {
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

    it('should validate mixed valid and invalid files', () => {
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
    it('should validate profile image files correctly', () => {
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

    it('should reject non-image files for profile category', () => {
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

    it('should validate todo attachment files correctly', () => {
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

    it('should reject blocked files for todo attachments', () => {
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
    it('should extract errors for failed validations', () => {
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

    it('should return empty array when all validations pass', () => {
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
    it('should return only valid files', () => {
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

    it('should return empty array when no files are valid', () => {
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
    it('should format bytes correctly', () => {
      expect(service.formatFileSize(0)).toBe('0 Bytes');
      expect(service.formatFileSize(1024)).toBe('1 KB');
      expect(service.formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(service.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should format decimal values correctly', () => {
      expect(service.formatFileSize(1536)).toBe('1.5 KB');
      expect(service.formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
    });
  });

  describe('isValidFileType', () => {
    it('should return true for allowed file types', () => {
      const result = service.isValidFileType(
        'document.pdf',
        ['.pdf', '.docx'],
        [],
      );
      expect(result).toBe(true);
    });

    it('should return false for blocked file types', () => {
      const result = service.isValidFileType(
        'script.exe',
        ['.exe', '.pdf'],
        ['.exe'],
      );
      expect(result).toBe(false);
    });

    it('should return false for disallowed file types', () => {
      const result = service.isValidFileType(
        'image.jpg',
        ['.pdf', '.docx'],
        [],
      );
      expect(result).toBe(false);
    });

    it('should handle case-insensitive extensions', () => {
      const result = service.isValidFileType('Document.PDF', ['.pdf'], []);
      expect(result).toBe(true);
    });
  });
});
