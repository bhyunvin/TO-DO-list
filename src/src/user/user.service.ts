import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserEntity } from './user.entity';
import { UserDto } from './user.dto';
import { encrypt, isHashValid } from '../utils/cryptUtil';
import { FileUploadUtil } from '../fileUpload/fileUploadUtil';
import { FileValidationService } from '../fileUpload/validation/file-validation.service';
import { setAuditColumn } from '../utils/auditColumns';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    private fileUploadUtil: FileUploadUtil,
    private fileValidationService: FileValidationService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

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

  //  회원가입
  async signup(
    userDto: UserDto,
    profileImageFile: Express.Multer.File,
    ip: string,
  ): Promise<UserDto> {
    return this.dataSource.transaction(async (transactionalEntityManager) => {
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
}
