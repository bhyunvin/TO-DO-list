import { Injectable, Logger, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, Not } from 'typeorm';
import { UserEntity } from './user.entity';
import { UserDto, UpdateUserDto } from './user.dto';
import { encrypt, isHashValid } from '../utils/cryptUtil';
import { FileUploadUtil } from '../fileUpload/fileUploadUtil';
import { FileValidationService } from '../fileUpload/validation/file-validation.service';
import { InputSanitizerService } from '../utils/inputSanitizer';
import { setAuditColumn } from '../utils/auditColumns';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    private fileUploadUtil: FileUploadUtil,
    private fileValidationService: FileValidationService,
    private inputSanitizer: InputSanitizerService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) { }

  // 로그인 로직 (컨트롤러에서 세션 처리)
  async login(userDto: UserDto): Promise<Omit<UserEntity, 'userPassword'>> {
    const selectedUser = await this.userRepository.findOne({
      where: { userId: userDto.userId },
    });
    if (!selectedUser) {
      throw new UnauthorizedException('아이디나 비밀번호가 다릅니다.');
    }

    const isPasswordMatch = await isHashValid(
      userDto.userPassword,
      selectedUser.userPassword,
    );
    if (!isPasswordMatch) {
      throw new UnauthorizedException('아이디나 비밀번호가 다릅니다.');
    }

    const { userPassword, ...userToStore } = selectedUser;
    return userToStore;
  }

  // ID 중복체크
  async checkIdDuplicated(userId: string): Promise<boolean> {
    const selectedUser = await this.userRepository.findOne({
      where: { userId },
    });
    return !!selectedUser;
  }

  // 회원가입
  async signup(
    userDto: UserDto,
    profileImageFile: Express.Multer.File,
    ip: string,
  ): Promise<UserDto> {
    return this.dataSource.transaction(async (transactionalEntityManager) => {
      // Check email uniqueness
      const existingUserWithEmail = await transactionalEntityManager.findOne(UserEntity, {
        where: { userEmail: userDto.userEmail },
      });

      if (existingUserWithEmail) {
        throw new BadRequestException('이미 사용 중인 이메일 주소입니다.');
      }

      userDto.userPassword = await encrypt(userDto.userPassword); // 비밀번호 암호화

      // 유저 정보를 저장합니다.
      let newUser = this.userRepository.create(userDto);
      newUser = setAuditColumn({ entity: newUser, id: userDto.userId, ip });
      const savedUser = await transactionalEntityManager.save(
        UserEntity,
        newUser,
      );

      // 프로필 이미지 등록 시
      if (profileImageFile) {
        try {
          // Validate profile image file
          const validationResults = this.fileValidationService.validateFilesByCategory(
            [profileImageFile],
            'profile_image',
          );

          const validationResult = validationResults[0];
          if (!validationResult.isValid) {
            this.logger.error('Profile image validation failed', {
              userId: userDto.userId,
              fileName: profileImageFile.originalname,
              errorCode: validationResult.errorCode,
              errorMessage: validationResult.errorMessage,
            });

            throw new BadRequestException({
              message: 'Profile image validation failed',
              error: validationResult.errorMessage,
              errorCode: validationResult.errorCode,
            });
          }

          // Save validated profile image
          const fileUploadResult = await this.fileUploadUtil.saveFileInfo(
            [profileImageFile],
            { entity: null, id: userDto.userId, ip },
            'profile_image', // Specify file category
          );

          userDto.userProfileImageFileGroupNo = fileUploadResult.fileGroupNo;

          // 프로필 이미지 정보로 유저 정보를 업데이트합니다.
          savedUser.userProfileImageFileGroupNo =
            userDto.userProfileImageFileGroupNo;
          await transactionalEntityManager.save(UserEntity, savedUser);

          this.logger.log('Profile image uploaded successfully', {
            userId: userDto.userId,
            fileName: profileImageFile.originalname,
            fileGroupNo: fileUploadResult.fileGroupNo,
          });

        } catch (error) {
          this.logger.error('Profile image upload failed', {
            userId: userDto.userId,
            fileName: profileImageFile?.originalname,
            error: error.message,
          });

          // If it's already a BadRequestException, re-throw it
          if (error instanceof BadRequestException) {
            throw error;
          }

          // For other errors, wrap in BadRequestException
          throw new BadRequestException({
            message: 'Profile image upload failed',
            error: error.message,
          });
        }
      }

      return savedUser;
    });
  }

  // 프로필 업데이트
  async updateProfile(
    userSeq: number,
    updateUserDto: UpdateUserDto,
    profileImageFile: Express.Multer.File,
    ip: string,
  ): Promise<Omit<UserEntity, 'userPassword'>> {
    return this.dataSource.transaction(async (transactionalEntityManager) => {
      // Enhanced user validation
      const currentUser = await transactionalEntityManager.findOne(UserEntity, {
        where: { userSeq },
      });

      if (!currentUser) {
        this.logger.error('Profile update attempted for non-existent user', {
          userSeq,
          ip,
        });
        throw new BadRequestException('사용자를 찾을 수 없습니다.');
      }

      // Additional security check - ensure user is active (if you have such a field)
      // This is a placeholder for future user status checks
      if (currentUser.adminYn === 'SUSPENDED') {
        this.logger.warn('Profile update attempted by suspended user', {
          userSeq,
          userId: currentUser.userId,
          ip,
        });
        throw new ForbiddenException('계정이 일시 정지되어 프로필을 수정할 수 없습니다.');
      }

      // Validate and sanitize input data
      const sanitizedDto = this.validateAndSanitizeUpdateData(updateUserDto, currentUser);

      // Enhanced email uniqueness check with additional validation
      if (sanitizedDto.userEmail && sanitizedDto.userEmail !== currentUser.userEmail) {
        // Additional email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitizedDto.userEmail)) {
          throw new BadRequestException({
            message: 'Invalid email format',
            error: '올바른 이메일 형식이 아닙니다.',
            errorCode: 'INVALID_EMAIL_FORMAT',
          });
        }

        // Check for email uniqueness
        const existingUser = await transactionalEntityManager.findOne(UserEntity, {
          where: {
            userEmail: sanitizedDto.userEmail,
            userSeq: Not(userSeq) // Exclude current user
          },
        });

        if (existingUser) {
          this.logger.warn('Profile update attempted with duplicate email', {
            userSeq,
            attemptedEmail: sanitizedDto.userEmail,
            existingUserSeq: existingUser.userSeq,
            ip,
          });
          throw new BadRequestException({
            message: 'Email already in use',
            error: '이미 사용 중인 이메일 주소입니다.',
            errorCode: 'DUPLICATE_EMAIL',
          });
        }
      }

      // Track what fields are being updated for audit purposes
      const updatedFields: string[] = [];

      // Update user fields with additional validation
      if (sanitizedDto.userName !== undefined && sanitizedDto.userName !== currentUser.userName) {
        if (sanitizedDto.userName.length === 0) {
          throw new BadRequestException({
            message: 'Name cannot be empty',
            error: '사용자명은 비어있을 수 없습니다.',
            errorCode: 'EMPTY_NAME',
          });
        }
        currentUser.userName = sanitizedDto.userName;
        updatedFields.push('userName');
      }

      if (sanitizedDto.userEmail !== undefined && sanitizedDto.userEmail !== currentUser.userEmail) {
        currentUser.userEmail = sanitizedDto.userEmail;
        updatedFields.push('userEmail');
      }

      if (sanitizedDto.userDescription !== undefined && sanitizedDto.userDescription !== currentUser.userDescription) {
        currentUser.userDescription = sanitizedDto.userDescription;
        updatedFields.push('userDescription');
      }

      // Enhanced profile image handling with additional security checks
      if (profileImageFile) {
        try {
          // Additional file security checks
          this.validateProfileImageSecurity(profileImageFile, userSeq, ip);

          // Validate profile image file
          const validationResults = this.fileValidationService.validateFilesByCategory(
            [profileImageFile],
            'profile_image',
          );

          const validationResult = validationResults[0];
          if (!validationResult.isValid) {
            this.logger.error('Profile image validation failed during update', {
              userSeq,
              fileName: profileImageFile.originalname,
              fileSize: profileImageFile.size,
              errorCode: validationResult.errorCode,
              errorMessage: validationResult.errorMessage,
              ip,
            });

            throw new BadRequestException({
              message: 'Profile image validation failed',
              error: validationResult.errorMessage,
              errorCode: validationResult.errorCode,
            });
          }

          // Save validated profile image
          const fileUploadResult = await this.fileUploadUtil.saveFileInfo(
            [profileImageFile],
            { entity: null, id: currentUser.userId, ip },
            'profile_image',
          );

          currentUser.userProfileImageFileGroupNo = fileUploadResult.fileGroupNo;
          updatedFields.push('profileImage');

          this.logger.log('Profile image updated successfully', {
            userSeq,
            fileName: profileImageFile.originalname,
            fileSize: profileImageFile.size,
            fileGroupNo: fileUploadResult.fileGroupNo,
            ip,
          });

        } catch (error) {
          this.logger.error('Profile image upload failed during update', {
            userSeq,
            fileName: profileImageFile?.originalname,
            fileSize: profileImageFile?.size,
            error: error.message,
            ip,
          });

          // If it's already a BadRequestException, re-throw it
          if (error instanceof BadRequestException) {
            throw error;
          }

          // For other errors, wrap in BadRequestException
          throw new BadRequestException({
            message: 'Profile image upload failed',
            error: error.message,
            errorCode: 'PROFILE_IMAGE_UPLOAD_FAILED',
          });
        }
      }

      // Log the update attempt for audit purposes
      this.logger.log('Profile update processing', {
        userSeq,
        userId: currentUser.userId,
        updatedFields,
        hasNewProfileImage: !!profileImageFile,
        ip,
      });

      // Set audit columns for update
      const updatedUser = setAuditColumn({
        entity: currentUser,
        id: currentUser.userId,
        ip
      });

      // Save updated user
      const savedUser = await transactionalEntityManager.save(UserEntity, updatedUser);

      // Log successful update
      this.logger.log('Profile update completed successfully', {
        userSeq,
        userId: savedUser.userId,
        updatedFields,
        ip,
      });

      // Return user without password
      const { userPassword, ...userToReturn } = savedUser;
      return userToReturn;
    });
  }

  /**
   * Validates and sanitizes profile update data
   */
  private validateAndSanitizeUpdateData(
    updateUserDto: UpdateUserDto,
    currentUser: UserEntity,
  ): UpdateUserDto {
    const sanitized: UpdateUserDto = {};

    // Sanitize name
    if (updateUserDto.userName !== undefined) {
      sanitized.userName = this.inputSanitizer.sanitizeName(updateUserDto.userName);
      
      // Additional name validation
      if (sanitized.userName && sanitized.userName.length > 200) {
        throw new BadRequestException({
          message: 'Name too long',
          error: '사용자명이 너무 깁니다.',
          errorCode: 'NAME_TOO_LONG',
        });
      }
    }

    // Sanitize email
    if (updateUserDto.userEmail !== undefined) {
      sanitized.userEmail = this.inputSanitizer.sanitizeEmail(updateUserDto.userEmail);
      
      // Additional email validation
      if (sanitized.userEmail && sanitized.userEmail.length > 100) {
        throw new BadRequestException({
          message: 'Email too long',
          error: '이메일이 너무 깁니다.',
          errorCode: 'EMAIL_TOO_LONG',
        });
      }
    }

    // Sanitize description
    if (updateUserDto.userDescription !== undefined) {
      sanitized.userDescription = this.inputSanitizer.sanitizeDescription(updateUserDto.userDescription);
      
      // Additional description validation
      if (sanitized.userDescription && sanitized.userDescription.length > 4000) {
        throw new BadRequestException({
          message: 'Description too long',
          error: '사용자설명이 너무 깁니다.',
          errorCode: 'DESCRIPTION_TOO_LONG',
        });
      }
    }

    return sanitized;
  }

  /**
   * Additional security validation for profile image uploads
   */
  private validateProfileImageSecurity(
    profileImageFile: Express.Multer.File,
    userSeq: number,
    ip: string,
  ): void {
    // Check file name for suspicious patterns
    const suspiciousPatterns = [
      /\.(php|jsp|asp|aspx|exe|bat|cmd|sh)$/i,
      /\.(htaccess|htpasswd)$/i,
      /[<>:"\\|?*]/,
      /\.\./,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(profileImageFile.originalname)) {
        this.logger.error('Suspicious profile image filename detected', {
          userSeq,
          fileName: profileImageFile.originalname,
          pattern: pattern.toString(),
          ip,
        });
        
        throw new BadRequestException({
          message: 'Invalid filename',
          error: '파일명에 허용되지 않는 문자가 포함되어 있습니다.',
          errorCode: 'INVALID_FILENAME',
        });
      }
    }

    // Check for excessively large files (additional check beyond multer limits)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (profileImageFile.size > maxSize) {
      this.logger.warn('Profile image file too large', {
        userSeq,
        fileName: profileImageFile.originalname,
        fileSize: profileImageFile.size,
        maxSize,
        ip,
      });
      
      throw new BadRequestException({
        message: 'File too large',
        error: '파일 크기가 너무 큽니다.',
        errorCode: 'FILE_TOO_LARGE',
      });
    }

    // Check MIME type matches file extension
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(profileImageFile.mimetype)) {
      this.logger.error('Invalid profile image MIME type', {
        userSeq,
        fileName: profileImageFile.originalname,
        mimeType: profileImageFile.mimetype,
        ip,
      });
      
      throw new BadRequestException({
        message: 'Invalid file type',
        error: '지원되지 않는 파일 형식입니다.',
        errorCode: 'INVALID_FILE_TYPE',
      });
    }
  }
}
