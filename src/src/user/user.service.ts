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
import { FileInfoEntity } from '../fileUpload/file.entity'; // FileInfoEntity 임포트
import {
  UserDto,
  UpdateUserDto,
  ChangePasswordDto,
  LoginDto,
} from './user.dto';
import {
  encrypt,
  isHashValid,
  encryptSymmetric,
  decryptSymmetric,
  encryptSymmetricDeterministic,
  decryptSymmetricDeterministic,
} from '../utils/cryptUtil';
import { FileUploadUtil } from '../fileUpload/fileUploadUtil';
import { FileValidationService } from '../fileUpload/validation/file-validation.service';
import { InputSanitizerService } from '../utils/inputSanitizer';
import { setAuditColumn } from '../utils/auditColumns';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(FileInfoEntity) // FileInfo 리포지토리 주입
    private readonly fileInfoRepository: Repository<FileInfoEntity>,
    private readonly fileUploadUtil: FileUploadUtil,
    private readonly fileValidationService: FileValidationService,
    private readonly inputSanitizer: InputSanitizerService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  decryptUserInfo<T extends Partial<UserEntity>>(user: T): T {
    if (!user) return user;

    // 이메일 복호화 (결정적 암호화 사용)
    if (user.userEmail) {
      user.userEmail = decryptSymmetricDeterministic(user.userEmail);
    }

    // API Key 복호화 (일반 양방향 암호화 사용)
    if (user.aiApiKey) {
      user.aiApiKey = decryptSymmetric(user.aiApiKey);
    }

    return user;
  }

  getPublicUserInfo<T extends Partial<UserEntity>>(user: T): T {
    if (!user) return user;
    return { ...user };
  }

  async login(
    loginDto: LoginDto,
  ): Promise<Omit<UserEntity, 'userPassword' | 'setProfileImage'>> {
    const { userId } = loginDto;
    const selectedUser = await this.userRepository.findOne({
      where: { userId },
    });

    if (!selectedUser) {
      throw new UnauthorizedException('아이디나 비밀번호가 다릅니다.');
    }

    const isPasswordMatch = await isHashValid(
      loginDto.userPassword,
      selectedUser.userPassword,
    );

    if (!isPasswordMatch) {
      throw new UnauthorizedException('아이디나 비밀번호가 다릅니다.');
    }

    // 프로필 이미지 URL 최적화 (Cloudinary 등 외부 URL 직접 반환)
    if (selectedUser.userProfileImageFileGroupNo) {
      const fileInfo = await this.fileInfoRepository.findOne({
        where: { fileGroupNo: selectedUser.userProfileImageFileGroupNo },
      });
      if (fileInfo?.filePath.startsWith('http')) {
        selectedUser.profileImage = fileInfo.filePath;
      }
    }

    const { userPassword: _, ...userToStore } = selectedUser;

    // @AfterLoad에 의해 profileImage가 이미 설정되어 있음

    return userToStore;
  }

  async checkIdDuplicated(userId: string): Promise<boolean> {
    const selectedUser = await this.userRepository.findOne({
      where: { userId },
    });
    return !!selectedUser;
  }

  async getUser(userSeq: number): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: { userSeq },
    });
    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    }

    // 프로필 이미지 URL 최적화
    if (user.userProfileImageFileGroupNo) {
      const fileInfo = await this.fileInfoRepository.findOne({
        where: { fileGroupNo: user.userProfileImageFileGroupNo },
      });
      if (fileInfo?.filePath.startsWith('http')) {
        user.profileImage = fileInfo.filePath;
      }
    }

    return user;
  }

  async signup(
    userDto: UserDto,
    profileImageFile: Express.Multer.File,
    ip: string,
  ): Promise<UserDto> {
    return this.dataSource.transaction(async (transactionalEntityManager) => {
      // 이메일 고유성 확인 (결정적 암호화 값으로 조회)
      const { userEmail, userPassword, userId } = userDto;
      const encryptedEmail = encryptSymmetricDeterministic(userEmail);

      const existingUserWithEmail = await transactionalEntityManager.findOne(
        UserEntity,
        {
          where: { userEmail: encryptedEmail },
        },
      );

      if (existingUserWithEmail) {
        throw new BadRequestException('이미 사용 중인 이메일 주소입니다.');
      }

      userDto.userPassword = await encrypt(userPassword); // 비밀번호 암호화
      userDto.userEmail = encryptedEmail; // 이메일 암호화하여 저장

      // 유저 정보를 저장합니다.
      let newUser = this.userRepository.create(userDto);
      newUser = setAuditColumn({ entity: newUser, id: userId, ip });
      const savedUser = await transactionalEntityManager.save(
        UserEntity,
        newUser,
      );

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

          const fileUploadResult = await this.fileUploadUtil.saveFileInfo(
            [profileImageFile],
            { entity: null, id: userId, ip },
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

      // 프로필 이미지 URL 설정
      savedUser.setProfileImage();

      return savedUser;
    });
  }

  async updateProfile(
    userSeq: number,
    updateUserDto: UpdateUserDto,
    profileImageFile: Express.Multer.File,
    ip: string,
  ): Promise<Omit<UserEntity, 'userPassword' | 'setProfileImage'>> {
    return this.dataSource.transaction(async (transactionalEntityManager) => {
      const currentUser = await this.validateAndGetUserForUpdate(
        transactionalEntityManager,
        userSeq,
        ip,
      );
      const { userId: currentUserId } = currentUser;

      const sanitizedDto = this.validateAndSanitizeUpdateData(updateUserDto);

      await this.validateAndCheckEmail(
        transactionalEntityManager,
        userSeq,
        sanitizedDto.userEmail,
        currentUser.userEmail,
        ip,
      );

      const updatedFields = this.updateUserFields(currentUser, sanitizedDto);

      if (profileImageFile) {
        await this.handleProfileImageUpdate(
          currentUser,
          profileImageFile,
          updatedFields,
          ip,
        );
      }

      this.logger.log('Profile update processing', {
        userSeq,
        userId: currentUserId,
        updatedFields,
        hasNewProfileImage: !!profileImageFile,
        ip,
      });

      const updatedUser = setAuditColumn({
        entity: currentUser,
        id: currentUserId,
        ip,
        isUpdate: true,
      });

      const savedUser = await transactionalEntityManager.save(
        UserEntity,
        updatedUser,
      );
      savedUser.setProfileImage();

      // 프로필 이미지 URL 최적화 (Cloudinary 직접 URL)
      if (savedUser.userProfileImageFileGroupNo) {
        // 트랜잭션 안이라도 fileInfo는 이미 커밋되었거나 다른 테이블이므로 조회 가능
        const fileInfo = await transactionalEntityManager.findOne(
          FileInfoEntity,
          {
            where: { fileGroupNo: savedUser.userProfileImageFileGroupNo },
          },
        );
        if (fileInfo?.filePath.startsWith('http')) {
          savedUser.profileImage = fileInfo.filePath;
        }
      }

      const { userId: savedUserId } = savedUser;

      this.logger.log('Profile update completed successfully', {
        userSeq,
        userId: savedUserId,
        updatedFields,
        ip,
      });

      const { userPassword: _, ...userToReturn } = savedUser;

      return userToReturn;
    });
  }

  private async validateAndGetUserForUpdate(
    entityManager: any, // EntityManager 타입을 any로 임시 처리 혹은 모듈에서 import 필요 (여기선 흐름상 any 허용 혹은 EntityManager import 추가 권장하지만 import 최소화 위해)
    userSeq: number,
    ip: string,
  ): Promise<UserEntity> {
    const currentUser = await entityManager.findOne(UserEntity, {
      where: { userSeq },
    });

    if (!currentUser) {
      this.logger.error('Profile update attempted for non-existent user', {
        userSeq,
        ip,
      });
      throw new BadRequestException('사용자를 찾을 수 없습니다.');
    }

    if (currentUser.adminYn === 'SUSPENDED') {
      this.logger.warn('Profile update attempted by suspended user', {
        userSeq,
        userId: currentUser.userId,
        ip,
      });
      throw new ForbiddenException(
        '계정이 일시 정지되어 프로필을 수정할 수 없습니다.',
      );
    }

    return currentUser;
  }

  private async validateAndCheckEmail(
    entityManager: any,
    userSeq: number,
    newEmail: string | undefined,
    currentEmail: string,
    ip: string,
  ): Promise<void> {
    if (!newEmail || newEmail === currentEmail) {
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      throw new BadRequestException({
        message: 'Invalid email format',
        error: '올바른 이메일 형식이 아닙니다.',
        errorCode: 'INVALID_EMAIL_FORMAT',
      });
    }

    const encryptedNewEmail = encryptSymmetricDeterministic(newEmail);

    const existingUser = await entityManager.findOne(UserEntity, {
      where: {
        userEmail: encryptedNewEmail,
        userSeq: Not(userSeq), // 현재 사용자 제외
      },
    });

    if (existingUser) {
      this.logger.warn('Profile update attempted with duplicate email', {
        userSeq,
        attemptedEmail: newEmail,
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

  private updateUserFields(
    currentUser: UserEntity,
    sanitizedDto: UpdateUserDto,
  ): string[] {
    const updatedFields: string[] = [];
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

    if (this.shouldUpdate(newName, currentName)) {
      currentUser.userName = newName;
      updatedFields.push('userName');
    }

    if (this.shouldUpdate(newUserEmail, currentUserEmail)) {
      currentUser.userEmail = encryptSymmetricDeterministic(newUserEmail);
      updatedFields.push('userEmail');
    }

    if (newDescription !== undefined && newDescription !== currentDescription) {
      currentUser.userDescription = newDescription;
      updatedFields.push('userDescription');
    }

    if (newApiKey !== undefined) {
      const apiKeyUpdated = this.updateApiKey(
        currentUser,
        newApiKey,
        currentApiKey,
      );
      if (apiKeyUpdated) {
        updatedFields.push('aiApiKey');
      }
    }

    return updatedFields;
  }

  private shouldUpdate(
    newValue: string | undefined,
    currentValue: string,
  ): boolean {
    return (
      newValue !== undefined &&
      newValue !== currentValue &&
      newValue.trim().length > 0
    );
  }

  private updateApiKey(
    currentUser: UserEntity,
    newApiKey: string,
    currentApiKey: string | null,
  ): boolean {
    if (newApiKey === '') {
      if (currentApiKey !== null) {
        currentUser.aiApiKey = null;
        return true;
      }
      return false;
    }

    const encryptedKey = encryptSymmetric(newApiKey);
    if (currentUser.aiApiKey !== encryptedKey) {
      currentUser.aiApiKey = encryptedKey;
      return true;
    }
    return false;
  }

  private async handleProfileImageUpdate(
    currentUser: UserEntity,
    profileImageFile: Express.Multer.File,
    updatedFields: string[],
    ip: string,
  ): Promise<void> {
    const { userSeq, userId: currentUserId } = currentUser;

    try {
      this.validateProfileImageSecurity(profileImageFile, userSeq, ip);

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

      const fileUploadResult = await this.fileUploadUtil.saveFileInfo(
        [profileImageFile],
        { entity: null, id: currentUserId, ip },
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

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException({
        message: 'Profile image upload failed',
        error: message,
        errorCode: 'PROFILE_IMAGE_UPLOAD_FAILED',
      });
    }
  }

  private validateAndSanitizeUpdateData(
    updateUserDto: UpdateUserDto,
  ): UpdateUserDto {
    const sanitized: UpdateUserDto = {};
    const { userName, userEmail, userDescription, aiApiKey } = updateUserDto;

    // 이름 새니타이즈
    if (userName !== undefined) {
      sanitized.userName = this.inputSanitizer.sanitizeName(userName);

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

    // API Key 전달 (별도 새니타이즈 불필요, DTO 레벨에서 처리됨)
    if (aiApiKey !== undefined) {
      sanitized.aiApiKey = aiApiKey;
    }

    return sanitized;
  }

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

  async changePassword(
    userSeq: number,
    changePasswordDto: ChangePasswordDto,
    ip: string,
  ): Promise<void> {
    return this.dataSource.transaction(async (transactionalEntityManager) => {
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

      if (newPassword !== confirmPassword) {
        throw new BadRequestException(
          '새 비밀번호와 비밀번호 확인이 일치하지 않습니다.',
        );
      }

      const isSamePassword = await isHashValid(newPassword, userPassword);

      if (isSamePassword) {
        throw new BadRequestException(
          '새 비밀번호는 현재 비밀번호와 달라야 합니다.',
        );
      }

      const encryptedNewPassword = await encrypt(newPassword);

      currentUser.userPassword = encryptedNewPassword;

      const updatedUser = setAuditColumn({
        entity: currentUser,
        id: userId,
        ip,
        isUpdate: true,
      });

      await transactionalEntityManager.save(UserEntity, updatedUser);

      this.logger.log('Password change completed successfully', {
        userSeq,
        userId,
        ip,
      });
    });
  }
}
