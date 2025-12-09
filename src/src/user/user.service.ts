import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, Not } from 'typeorm';
import { UserEntity } from './user.entity';
import { UserDto, UpdateUserDto, ChangePasswordDto } from './user.dto';
import { encrypt, isHashValid, encryptSymmetric } from '../utils/cryptUtil';
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
  ) {}

  // 로그인 로직 (컨트롤러에서 세션 처리)
  async login(userDto: UserDto): Promise<Omit<UserEntity, 'userPassword'>> {
    const { userId } = userDto;
    const selectedUser = await this.userRepository.findOne({
      where: { userId },
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

    const { userPassword: _, ...userToStore } = selectedUser;
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
      // 이메일 고유성 확인
      const { userEmail, userPassword, userId } = userDto;
      const existingUserWithEmail = await transactionalEntityManager.findOne(
        UserEntity,
        {
          where: { userEmail },
        },
      );

      if (existingUserWithEmail) {
        throw new BadRequestException('이미 사용 중인 이메일 주소입니다.');
      }

      userDto.userPassword = await encrypt(userPassword); // 비밀번호 암호화

      // 유저 정보를 저장합니다.
      let newUser = this.userRepository.create(userDto);
      newUser = setAuditColumn({ entity: newUser, id: userId, ip });
      const savedUser = await transactionalEntityManager.save(
        UserEntity,
        newUser,
      );

      // 프로필 이미지 등록 시
      if (profileImageFile) {
        try {
          // 프로필 이미지 파일 검증
          const validationResults =
            this.fileValidationService.validateFilesByCategory(
              [profileImageFile],
              'profile_image',
            );

          const [validationResult] = validationResults;
          const { isValid, errorCode, errorMessage } = validationResult;

          if (!isValid) {
            const { originalname } = profileImageFile;
            this.logger.error('Profile image validation failed', {
              userId,
              fileName: originalname,
              errorCode,
              errorMessage,
            });

            throw new BadRequestException({
              message: 'Profile image validation failed',
              error: errorMessage,
              errorCode,
            });
          }

          // 검증된 프로필 이미지 저장
          const fileUploadResult = await this.fileUploadUtil.saveFileInfo(
            [profileImageFile],
            { entity: null, id: userId, ip },
            'profile_image', // 파일 카테고리 지정
          );

          const { fileGroupNo } = fileUploadResult;
          userDto.userProfileImageFileGroupNo = fileGroupNo;

          // 프로필 이미지 정보로 유저 정보를 업데이트합니다.
          savedUser.userProfileImageFileGroupNo = fileGroupNo;
          await transactionalEntityManager.save(UserEntity, savedUser);

          const { originalname } = profileImageFile;
          this.logger.log('Profile image uploaded successfully', {
            userId,
            fileName: originalname,
            fileGroupNo,
          });
        } catch (error) {
          const { message } = error;
          this.logger.error('Profile image upload failed', {
            userId,
            fileName: profileImageFile?.originalname,
            error: message,
          });

          // 이미 BadRequestException인 경우, 재발생
          if (error instanceof BadRequestException) {
            throw error;
          }

          // 다른 오류의 경우, BadRequestException으로 래핑
          throw new BadRequestException({
            message: 'Profile image upload failed',
            error: message,
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
      // 향상된 사용자 검증
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

      const { adminYn, userId: currentUserId } = currentUser;

      // 추가 보안 검사 - 사용자가 활성 상태인지 확인 (해당 필드가 있는 경우)
      // 향후 사용자 상태 검사를 위한 플레이스홀더
      if (adminYn === 'SUSPENDED') {
        this.logger.warn('Profile update attempted by suspended user', {
          userSeq,
          userId: currentUserId,
          ip,
        });
        throw new ForbiddenException(
          '계정이 일시 정지되어 프로필을 수정할 수 없습니다.',
        );
      }

      // 입력 데이터 검증 및 새니타이즈
      const sanitizedDto = this.validateAndSanitizeUpdateData(updateUserDto);

      // 추가 검증을 포함한 향상된 이메일 고유성 검사
      const { userEmail: newEmail } = sanitizedDto;
      const { userEmail: currentEmail } = currentUser;

      if (newEmail && newEmail !== currentEmail) {
        // 추가 이메일 형식 검증
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
          throw new BadRequestException({
            message: 'Invalid email format',
            error: '올바른 이메일 형식이 아닙니다.',
            errorCode: 'INVALID_EMAIL_FORMAT',
          });
        }

        // 이메일 고유성 확인
        const existingUser = await transactionalEntityManager.findOne(
          UserEntity,
          {
            where: {
              userEmail: newEmail,
              userSeq: Not(userSeq), // 현재 사용자 제외
            },
          },
        );

        if (existingUser) {
          const { userSeq: existingUserSeq } = existingUser;
          this.logger.warn('Profile update attempted with duplicate email', {
            userSeq,
            attemptedEmail: newEmail,
            existingUserSeq,
            ip,
          });
          throw new BadRequestException({
            message: 'Email already in use',
            error: '이미 사용 중인 이메일 주소입니다.',
            errorCode: 'DUPLICATE_EMAIL',
          });
        }
      }

      // 감사 목적으로 업데이트되는 필드 추적
      const updatedFields: string[] = [];

      // 추가 검증과 함께 사용자 필드 업데이트
      const {
        userName: newName,
        userEmail: newUserEmail,
        userDescription: newDescription,
        aiApiKey: newApiKey,
      } = sanitizedDto;
      const {
        userName: currentName,
        userEmail: currentUserEmail,
        userDescription: currentDescription,
        aiApiKey: currentApiKey,
      } = currentUser;

      if (newName !== undefined && newName !== currentName) {
        // userName이 undefined가 아니고 실제로 값이 있을 때만 업데이트
        if (newName && newName.trim().length > 0) {
          currentUser.userName = newName;
          updatedFields.push('userName');
        }
      }

      if (newUserEmail !== undefined && newUserEmail !== currentUserEmail) {
        // userEmail이 undefined가 아니고 실제로 값이 있을 때만 업데이트
        if (newUserEmail && newUserEmail.trim().length > 0) {
          currentUser.userEmail = newUserEmail;
          updatedFields.push('userEmail');
        }
      }

      if (
        newDescription !== undefined &&
        newDescription !== currentDescription
      ) {
        currentUser.userDescription = newDescription;
        updatedFields.push('userDescription');
      }

      if (newApiKey !== undefined) {
        // 빈 문자열인 경우 키 삭제로 간주, 값이 있는 경우 암호화하여 저장
        if (newApiKey === '') {
          if (currentApiKey !== null) {
            currentUser.aiApiKey = null;
            updatedFields.push('aiApiKey');
          }
        } else {
          // 새 키가 입력된 경우 (기존 키와 다른지 비교는 암호화 되어있어 어려우므로 무조건 업데이트하거나, 복호화해서 비교할 수 있음.
          // 여기서는 보안상 입력되면 무조건 업데이트)
          const encryptedKey = encryptSymmetric(newApiKey);
          if (currentUser.aiApiKey !== encryptedKey) {
            currentUser.aiApiKey = encryptedKey;
            updatedFields.push('aiApiKey');
          }
        }
      }

      // 추가 보안 검사를 포함한 향상된 프로필 이미지 처리
      if (profileImageFile) {
        try {
          // 추가 파일 보안 검사
          this.validateProfileImageSecurity(profileImageFile, userSeq, ip);

          // 프로필 이미지 파일 검증
          const validationResults =
            this.fileValidationService.validateFilesByCategory(
              [profileImageFile],
              'profile_image',
            );

          const [validationResult] = validationResults;
          const { isValid, errorCode, errorMessage } = validationResult;
          const { originalname, size } = profileImageFile;

          if (!isValid) {
            this.logger.error('Profile image validation failed during update', {
              userSeq,
              fileName: originalname,
              fileSize: size,
              errorCode,
              errorMessage,
              ip,
            });

            throw new BadRequestException({
              message: 'Profile image validation failed',
              error: errorMessage,
              errorCode,
            });
          }

          // 검증된 프로필 이미지 저장
          const fileUploadResult = await this.fileUploadUtil.saveFileInfo(
            [profileImageFile],
            { entity: null, id: currentUserId, ip },
            'profile_image',
          );

          const { fileGroupNo } = fileUploadResult;
          currentUser.userProfileImageFileGroupNo = fileGroupNo;
          updatedFields.push('profileImage');

          this.logger.log('Profile image updated successfully', {
            userSeq,
            fileName: originalname,
            fileSize: size,
            fileGroupNo,
            ip,
          });
        } catch (error) {
          const { message } = error;
          this.logger.error('Profile image upload failed during update', {
            userSeq,
            fileName: profileImageFile?.originalname,
            fileSize: profileImageFile?.size,
            error: message,
            ip,
          });

          // 이미 BadRequestException인 경우, 재발생
          if (error instanceof BadRequestException) {
            throw error;
          }

          // 다른 오류의 경우, BadRequestException으로 래핑
          throw new BadRequestException({
            message: 'Profile image upload failed',
            error: message,
            errorCode: 'PROFILE_IMAGE_UPLOAD_FAILED',
          });
        }
      }

      // 감사 목적으로 업데이트 시도 로깅
      this.logger.log('Profile update processing', {
        userSeq,
        userId: currentUserId,
        updatedFields,
        hasNewProfileImage: !!profileImageFile,
        ip,
      });

      // 업데이트를 위한 감사 컬럼 설정
      const updatedUser = setAuditColumn({
        entity: currentUser,
        id: currentUserId,
        ip,
      });

      // 업데이트된 사용자 저장
      const savedUser = await transactionalEntityManager.save(
        UserEntity,
        updatedUser,
      );

      const { userId: savedUserId } = savedUser;

      // 성공적인 업데이트 로깅
      this.logger.log('Profile update completed successfully', {
        userSeq,
        userId: savedUserId,
        updatedFields,
        ip,
      });

      // 비밀번호 없이 사용자 반환
      const { userPassword: _, ...userToReturn } = savedUser;
      return userToReturn;
    });
  }

  /**
   * 프로필 업데이트 데이터를 검증하고 새니타이즈합니다
   */
  private validateAndSanitizeUpdateData(
    updateUserDto: UpdateUserDto,
  ): UpdateUserDto {
    const sanitized: UpdateUserDto = {};
    const { userName, userEmail, userDescription } = updateUserDto;

    // 이름 새니타이즈
    if (userName !== undefined) {
      sanitized.userName = this.inputSanitizer.sanitizeName(userName);

      // 추가 이름 검증
      if (sanitized.userName && sanitized.userName.length > 200) {
        throw new BadRequestException({
          message: 'Name too long',
          error: '사용자명이 너무 깁니다.',
          errorCode: 'NAME_TOO_LONG',
        });
      }
    }

    // 이메일 새니타이즈
    if (userEmail !== undefined) {
      sanitized.userEmail = this.inputSanitizer.sanitizeEmail(userEmail);

      // 추가 이메일 검증
      if (sanitized.userEmail && sanitized.userEmail.length > 100) {
        throw new BadRequestException({
          message: 'Email too long',
          error: '이메일이 너무 깁니다.',
          errorCode: 'EMAIL_TOO_LONG',
        });
      }
    }

    // 설명 새니타이즈
    if (userDescription !== undefined) {
      sanitized.userDescription =
        this.inputSanitizer.sanitizeDescription(userDescription);

      // 추가 설명 검증
      if (
        sanitized.userDescription &&
        sanitized.userDescription.length > 4000
      ) {
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
   * 프로필 이미지 업로드를 위한 추가 보안 검증
   */
  private validateProfileImageSecurity(
    profileImageFile: Express.Multer.File,
    userSeq: number,
    ip: string,
  ): void {
    const { originalname, size, mimetype } = profileImageFile;

    // 의심스러운 패턴에 대한 파일 이름 검사
    const suspiciousPatterns = [
      /\.(php|jsp|asp|aspx|exe|bat|cmd|sh)$/i,
      /\.(htaccess|htpasswd)$/i,
      /[<>:"\\|?*]/,
      /\.\./,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(originalname)) {
        this.logger.error('Suspicious profile image filename detected', {
          userSeq,
          fileName: originalname,
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

    // 과도하게 큰 파일 검사 (multer 제한을 넘어선 추가 검사)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (size > maxSize) {
      this.logger.warn('Profile image file too large', {
        userSeq,
        fileName: originalname,
        fileSize: size,
        maxSize,
        ip,
      });

      throw new BadRequestException({
        message: 'File too large',
        error: '파일 크기가 너무 큽니다.',
        errorCode: 'FILE_TOO_LARGE',
      });
    }

    // MIME 타입이 파일 확장자와 일치하는지 검사
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];

    if (!allowedMimeTypes.includes(mimetype)) {
      this.logger.error('Invalid profile image MIME type', {
        userSeq,
        fileName: originalname,
        mimeType: mimetype,
        ip,
      });

      throw new BadRequestException({
        message: 'Invalid file type',
        error: '지원되지 않는 파일 형식입니다.',
        errorCode: 'INVALID_FILE_TYPE',
      });
    }
  }

  // 비밀번호 변경
  async changePassword(
    userSeq: number,
    changePasswordDto: ChangePasswordDto,
    ip: string,
  ): Promise<void> {
    return this.dataSource.transaction(async (transactionalEntityManager) => {
      // 향상된 사용자 검증
      const currentUser = await transactionalEntityManager.findOne(UserEntity, {
        where: { userSeq },
      });

      if (!currentUser) {
        this.logger.error('Password change attempted for non-existent user', {
          userSeq,
          ip,
        });
        throw new BadRequestException('사용자를 찾을 수 없습니다.');
      }

      const { adminYn, userId, userPassword } = currentUser;

      // 추가 보안 검사 - 사용자가 활성 상태인지 확인
      if (adminYn === 'SUSPENDED') {
        this.logger.warn('Password change attempted by suspended user', {
          userSeq,
          userId,
          ip,
        });
        throw new ForbiddenException(
          '계정이 일시 정지되어 비밀번호를 변경할 수 없습니다.',
        );
      }

      const { currentPassword, newPassword, confirmPassword } =
        changePasswordDto;

      // 현재 비밀번호 검증
      const isCurrentPasswordValid = await isHashValid(
        currentPassword,
        userPassword,
      );

      if (!isCurrentPasswordValid) {
        this.logger.warn(
          'Password change attempted with incorrect current password',
          {
            userSeq,
            userId,
            ip,
          },
        );
        throw new UnauthorizedException('현재 비밀번호가 올바르지 않습니다.');
      }

      // 새 비밀번호 확인 검증
      if (newPassword !== confirmPassword) {
        throw new BadRequestException(
          '새 비밀번호와 비밀번호 확인이 일치하지 않습니다.',
        );
      }

      // 새 비밀번호가 현재 비밀번호와 다른지 확인
      const isSamePassword = await isHashValid(newPassword, userPassword);

      if (isSamePassword) {
        throw new BadRequestException(
          '새 비밀번호는 현재 비밀번호와 달라야 합니다.',
        );
      }

      // 새 비밀번호 암호화
      const encryptedNewPassword = await encrypt(newPassword);

      // 비밀번호 업데이트
      currentUser.userPassword = encryptedNewPassword;

      // 업데이트를 위한 감사 컬럼 설정
      const updatedUser = setAuditColumn({
        entity: currentUser,
        id: userId,
        ip,
      });

      // 업데이트된 사용자 저장
      await transactionalEntityManager.save(UserEntity, updatedUser);

      // 성공적인 비밀번호 변경 로깅
      this.logger.log('Password change completed successfully', {
        userSeq,
        userId,
        ip,
      });
    });
  }
}
