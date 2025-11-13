import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { ForbiddenException } from '@nestjs/common';
import { UserService } from './user.service';
import { UserEntity } from './user.entity';
import { UpdateUserDto } from './user.dto';
import { FileUploadUtil } from '../fileUpload/fileUploadUtil';
import { FileValidationService } from '../fileUpload/validation/file-validation.service';
import { InputSanitizerService } from '../utils/inputSanitizer';

describe('UserService - Profile Update', () => {
  let service: UserService;
  let dataSource: DataSource;
  let inputSanitizer: InputSanitizerService;
  let mockEntityManager: EntityManager;

  const mockUser: UserEntity = {
    userSeq: 1,
    userId: 'testuser',
    userName: 'Test User',
    userEmail: 'test@example.com',
    userDescription: 'Test description',
    userPassword: 'hashedpassword',
    userProfileImageFileGroupNo: 1,
    adminYn: 'N',
    auditColumns: {
      regId: 'testuser',
      regDtm: new Date(),
      updId: 'testuser',
      updDtm: new Date(),
      regIp: '127.0.0.1',
      updIp: '127.0.0.1',
    },
  };

  beforeEach(async () => {
    mockEntityManager = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getDataSourceToken(),
          useValue: {
            transaction: jest.fn(),
          },
        },
        {
          provide: FileUploadUtil,
          useValue: {
            saveFileInfo: jest.fn(),
          },
        },
        {
          provide: FileValidationService,
          useValue: {
            validateFilesByCategory: jest.fn(),
          },
        },
        {
          provide: InputSanitizerService,
          useValue: {
            sanitizeName: jest.fn(),
            sanitizeEmail: jest.fn(),
            sanitizeDescription: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    dataSource = module.get<DataSource>(getDataSourceToken());
    inputSanitizer = module.get<InputSanitizerService>(InputSanitizerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateProfile', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should reject updates for suspended users', async () => {
      const suspendedUser = { ...mockUser, adminYn: 'SUSPENDED' };
      const updateDto: UpdateUserDto = { userName: 'New Name' };

      jest
        .spyOn(dataSource, 'transaction')
        .mockImplementation(async (callback: any) => {
          return callback(mockEntityManager);
        });

      jest.spyOn(mockEntityManager, 'findOne').mockResolvedValue(suspendedUser);

      await expect(
        service.updateProfile(1, updateDto, null, '127.0.0.1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should sanitize input data before processing', async () => {
      const updateDto: UpdateUserDto = {
        userName: '  John Doe  ',
        userEmail: '  JOHN@EXAMPLE.COM  ',
        userDescription: '  Test description  ',
      };
      const updatedUser = {
        ...mockUser,
        userName: 'John Doe',
        userEmail: 'john@example.com',
        userDescription: 'Test description',
      };

      jest
        .spyOn(dataSource, 'transaction')
        .mockImplementation(async (callback: any) => {
          return callback(mockEntityManager);
        });

      jest
        .spyOn(mockEntityManager, 'findOne')
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);
      jest.spyOn(mockEntityManager, 'save').mockResolvedValue(updatedUser);

      jest.spyOn(inputSanitizer, 'sanitizeName').mockReturnValue('John Doe');
      jest
        .spyOn(inputSanitizer, 'sanitizeEmail')
        .mockReturnValue('john@example.com');
      jest
        .spyOn(inputSanitizer, 'sanitizeDescription')
        .mockReturnValue('Test description');

      const result = await service.updateProfile(
        1,
        updateDto,
        null,
        '127.0.0.1',
      );

      expect(inputSanitizer.sanitizeName).toHaveBeenCalledWith('  John Doe  ');
      expect(inputSanitizer.sanitizeEmail).toHaveBeenCalledWith(
        '  JOHN@EXAMPLE.COM  ',
      );
      expect(inputSanitizer.sanitizeDescription).toHaveBeenCalledWith(
        '  Test description  ',
      );
      expect(result.userName).toBe('John Doe');
      expect(result.userEmail).toBe('john@example.com');
    });
  });
});
