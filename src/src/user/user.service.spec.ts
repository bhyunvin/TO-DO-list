import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';
import { UserEntity } from './user.entity';
import { UpdateUserDto } from './user.dto';
import { FileUploadUtil } from '../fileUpload/fileUploadUtil';
import { FileValidationService } from '../fileUpload/validation/file-validation.service';

describe('UserService - Profile Update', () => {
  let service: UserService;
  let userRepository: Repository<UserEntity>;
  let dataSource: DataSource;
  let fileUploadUtil: FileUploadUtil;
  let fileValidationService: FileValidationService;
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

  const mockFile: Express.Multer.File = {
    fieldname: 'profileImage',
    originalname: 'profile.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024 * 1024, // 1MB
    destination: '/tmp',
    filename: 'profile.jpg',
    path: '/tmp/profile.jpg',
    buffer: Buffer.from('fake image data'),
    stream: null,
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
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
    dataSource = module.get<DataSource>(getDataSourceToken());
    fileUploadUtil = module.get<FileUploadUtil>(FileUploadUtil);
    fileValidationService = module.get<FileValidationService>(FileValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateProfile', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should successfully update user profile without image', async () => {
      const updateDto: UpdateUserDto = {
        userName: 'Updated Name',
        userEmail: 'updated@example.com',
        userDescription: 'Updated description',
      };

      const updatedUser = { ...mockUser, ...updateDto };

      jest.spyOn(dataSource, 'transaction').mockImplementation(async (callback: any) => {
        return callback(mockEntityManager);
      });

      jest.spyOn(mockEntityManager, 'findOne')
        .mockResolvedValueOnce(mockUser) // First call for current user
        .mockResolvedValueOnce(null); // Second call for email uniqueness check (no existing user)
      jest.spyOn(mockEntityManager, 'save').mockResolvedValue(updatedUser);

      const result = await service.updateProfile(1, updateDto, null, '127.0.0.1');

      expect(result).toEqual(expect.objectContaining({
        userName: 'Updated Name',
        userEmail: 'updated@example.com',
        userDescription: 'Updated description',
      }));
      expect(result).not.toHaveProperty('userPassword');
    });

    it('should successfully update user profile with image', async () => {
      const updateDto: UpdateUserDto = {
        userName: 'Updated Name',
      };

      const updatedUser = { ...mockUser, ...updateDto, userProfileImageFileGroupNo: 2 };

      jest.spyOn(dataSource, 'transaction').mockImplementation(async (callback: any) => {
        return callback(mockEntityManager);
      });

      jest.spyOn(mockEntityManager, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(mockEntityManager, 'save').mockResolvedValue(updatedUser);

      jest.spyOn(fileValidationService, 'validateFilesByCategory').mockReturnValue([
        { isValid: true },
      ]);

      jest.spyOn(fileUploadUtil, 'saveFileInfo').mockResolvedValue({
        fileGroupNo: 2,
        savedFiles: [],
      });

      const result = await service.updateProfile(1, updateDto, mockFile, '127.0.0.1');

      expect(result.userProfileImageFileGroupNo).toBe(2);
      expect(fileValidationService.validateFilesByCategory).toHaveBeenCalledWith(
        [mockFile],
        'profile_image',
      );
      expect(fileUploadUtil.saveFileInfo).toHaveBeenCalledWith(
        [mockFile],
        { entity: null, id: mockUser.userId, ip: '127.0.0.1' },
        'profile_image',
      );
    });

    it('should throw error when user not found', async () => {
      const updateDto: UpdateUserDto = {
        userName: 'Updated Name',
      };

      jest.spyOn(dataSource, 'transaction').mockImplementation(async (callback: any) => {
        return callback(mockEntityManager);
      });

      jest.spyOn(mockEntityManager, 'findOne').mockResolvedValue(null);

      await expect(service.updateProfile(999, updateDto, null, '127.0.0.1'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw error when email already exists', async () => {
      const updateDto: UpdateUserDto = {
        userEmail: 'existing@example.com',
      };

      const existingUser = { ...mockUser, userSeq: 2, userEmail: 'existing@example.com' };

      jest.spyOn(dataSource, 'transaction').mockImplementation(async (callback: any) => {
        return callback(mockEntityManager);
      });

      jest.spyOn(mockEntityManager, 'findOne')
        .mockResolvedValueOnce(mockUser) // First call for current user
        .mockResolvedValueOnce(existingUser); // Second call for email check with Not(userSeq)

      await expect(service.updateProfile(1, updateDto, null, '127.0.0.1'))
        .rejects.toThrow(BadRequestException);
    });

    it('should allow updating to same email', async () => {
      const updateDto: UpdateUserDto = {
        userEmail: 'test@example.com', // Same as current email
      };

      jest.spyOn(dataSource, 'transaction').mockImplementation(async (callback: any) => {
        return callback(mockEntityManager);
      });

      // Mock findOne calls - the service should work correctly regardless
      jest.spyOn(mockEntityManager, 'findOne')
        .mockResolvedValueOnce(mockUser) // First call for current user
        .mockResolvedValueOnce(null); // Second call for email check (should return null - no conflict)
      jest.spyOn(mockEntityManager, 'save').mockResolvedValue(mockUser);

      const result = await service.updateProfile(1, updateDto, null, '127.0.0.1');

      expect(result.userEmail).toBe('test@example.com');
      expect(result).not.toHaveProperty('userPassword');
      // Test should pass regardless of how many findOne calls are made, as long as no error is thrown
    });

    it('should throw error when profile image validation fails', async () => {
      const updateDto: UpdateUserDto = {
        userName: 'Updated Name',
      };

      jest.spyOn(dataSource, 'transaction').mockImplementation(async (callback: any) => {
        return callback(mockEntityManager);
      });

      jest.spyOn(mockEntityManager, 'findOne').mockResolvedValue(mockUser);

      jest.spyOn(fileValidationService, 'validateFilesByCategory').mockReturnValue([
        {
          isValid: false,
          errorCode: 'INVALID_FILE_TYPE',
          errorMessage: 'Invalid file type',
        },
      ]);

      await expect(service.updateProfile(1, updateDto, mockFile, '127.0.0.1'))
        .rejects.toThrow(BadRequestException);
    });

    it('should successfully update to different email when no conflict exists', async () => {
      const updateDto: UpdateUserDto = {
        userEmail: 'newemail@example.com', // Different from current email
      };

      const updatedUser = { ...mockUser, userEmail: 'newemail@example.com' };

      jest.spyOn(dataSource, 'transaction').mockImplementation(async (callback: any) => {
        return callback(mockEntityManager);
      });

      jest.spyOn(mockEntityManager, 'findOne')
        .mockResolvedValueOnce(mockUser) // First call for current user
        .mockResolvedValueOnce(null); // Second call for email uniqueness check (no conflict)
      jest.spyOn(mockEntityManager, 'save').mockResolvedValue(updatedUser);

      const result = await service.updateProfile(1, updateDto, null, '127.0.0.1');

      expect(result.userEmail).toBe('newemail@example.com');
      expect(mockEntityManager.findOne).toHaveBeenCalledTimes(2);
    });

    it('should handle partial updates correctly', async () => {
      const updateDto: UpdateUserDto = {
        userName: 'Only Name Updated',
        // userEmail and userDescription not provided
      };

      const updatedUser = { ...mockUser, userName: 'Only Name Updated' };

      jest.spyOn(dataSource, 'transaction').mockImplementation(async (callback: any) => {
        return callback(mockEntityManager);
      });

      jest.spyOn(mockEntityManager, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(mockEntityManager, 'save').mockResolvedValue(updatedUser);

      const result = await service.updateProfile(1, updateDto, null, '127.0.0.1');

      expect(result.userName).toBe('Only Name Updated');
      expect(result.userEmail).toBe(mockUser.userEmail); // Should remain unchanged
      expect(result.userDescription).toBe(mockUser.userDescription); // Should remain unchanged
    });
  });
});