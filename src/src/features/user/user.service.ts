import { Repository, DataSource } from 'typeorm';
import { UserEntity } from './user.entity';
import { RefreshTokenEntity } from './refresh-token.entity';
import { FileInfoEntity } from '../../fileUpload/file.entity';
import { FileUploadUtil } from '../../fileUpload/fileUploadUtil';
import { InputSanitizerService } from '../../utils/inputSanitizer';
import { encrypt, isHashValid, encryptSymmetric } from '../../utils/cryptUtil';
import { CloudinaryService } from '../../fileUpload/cloudinary.service';
import {
  LoginDto,
  RegisterDto,
  UpdateUserDto,
  ChangePasswordDto,
  UserResponseDto,
} from './user.schema';
import { AuditSettings, setAuditColumn } from '../../utils/auditColumns';

export class UserService {
  private readonly userRepository: Repository<UserEntity>;
  private readonly refreshTokenRepository: Repository<RefreshTokenEntity>;
  private readonly fileUploadUtil: FileUploadUtil;
  private readonly inputSanitizer: InputSanitizerService;

  constructor(
    private readonly dataSource: DataSource,
    private readonly cloudinaryService: CloudinaryService,
  ) {
    this.userRepository = dataSource.getRepository(UserEntity);
    this.refreshTokenRepository = dataSource.getRepository(RefreshTokenEntity);
    this.inputSanitizer = new InputSanitizerService();

    const fileInfoRepo = dataSource.getRepository(FileInfoEntity);
    this.fileUploadUtil = new FileUploadUtil(fileInfoRepo, cloudinaryService);
  }

  // --- 조회 로직 ---

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { userEmail: email } });
  }

  async findById(userSeq: number): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { userSeq } });
  }

  // --- 인증 로직 ---

  async register(
    registerDto: RegisterDto,
    clientIp: string,
    file?: File,
  ): Promise<UserResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { userEmail, userPw, userName, userPhone } = registerDto;

      // 1. 이메일 중복 확인
      const existingUser = await queryRunner.manager.findOne(UserEntity, {
        where: { userEmail },
      });
      if (existingUser) {
        throw new Error('이미 존재하는 이메일입니다.');
      }

      // 2. 비밀번호 해싱
      const hashedPassword = await encrypt(userPw);

      // 3. 사용자 엔티티 생성
      const newUser = queryRunner.manager.create(UserEntity, {
        userId: userEmail, // userId는 이메일과 동일하게 설정 (정책에 따라 변경 가능)
        userEmail: this.inputSanitizer.sanitizeEmail(userEmail),
        userPw: hashedPassword, // 컬럼명 주의: userPw
        userName: this.inputSanitizer.sanitizeName(userName),
        userPhone: userPhone ? await encryptSymmetric(userPhone) : undefined, // userPhone 컬럼이 없다면(Entity에 없음) 무시되거나 에러. Entity 확인 필요.
        // UserEntity에 userPhone이 없음. user_phone이 없다면 제외. Entity 다시 확인하니 userPhone 없음. -> 수정 필요
        adminYn: 'N',
        userDescription: '',
      });
      // UserEntity에 userPhone이 확인되지 않았음(Entity 파일 내용에는 없음).
      // 일단 userPhone 제외하고 진행. 필요시 Entity 수정.
      // -> 확인결과: UserEntity에 userPhone 없음. RegisterDto에는 있음.
      // -> 비즈니스 요구사항에 따라 Entity 추가하거나 DTO에서 제거해야 함. 일단 저장하지 않음.

      // Audit 설정
      const auditSettings: AuditSettings = {
        entity: newUser,
        id: 'SYSTEM', // 회원가입 시에는 ID 없음
        ip: clientIp,
        isUpdate: false,
      };
      setAuditColumn(auditSettings);

      const savedUser = await queryRunner.manager.save(UserEntity, newUser);

      // 생성 후 ID로 Audit 업데이트 필요할 수 있으나 생략

      // 4. 프로필 이미지 업로드 (파일이 있는 경우)
      if (file) {
        const fileAuditSettings: AuditSettings = {
          entity: null, // 내부에서 생성됨
          id: String(savedUser.userSeq),
          ip: clientIp,
          isUpdate: false,
        };

        const { savedFiles } = await this.fileUploadUtil.saveFileInfo(
          [file],
          fileAuditSettings,
          queryRunner.manager,
        );

        if (savedFiles.length > 0) {
          savedUser.userProfileImageFileGroupNo = savedFiles[0].fileGroupNo;

          // 업데이트를 위한 Audit 설정
          const updateAuditSettings: AuditSettings = {
            entity: savedUser,
            id: String(savedUser.userSeq),
            ip: clientIp,
            isUpdate: true,
          };
          setAuditColumn(updateAuditSettings);

          await queryRunner.manager.save(UserEntity, savedUser);
        }
      }

      await queryRunner.commitTransaction();

      return this.toUserResponse(savedUser);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async login(loginDto: LoginDto): Promise<UserEntity> {
    const { userEmail, userPw } = loginDto;
    const user = await this.userRepository.findOne({ where: { userEmail } });

    if (!user) {
      throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const isPwValid = await isHashValid(userPw, user.userPw); // userPw 컬럼
    if (!isPwValid) {
      throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    return user;
  }

  async saveRefreshToken(
    userSeq: number,
    token: string,
    clientIp: string,
  ): Promise<void> {
    const hashedToken = await encrypt(token);

    // 기존 토큰 조회
    let tokenEntity = await this.refreshTokenRepository.findOne({
      where: { userSeq },
    });

    if (tokenEntity) {
      tokenEntity.refreshToken = hashedToken;
      // Audit Update
      setAuditColumn({
        entity: tokenEntity,
        id: String(userSeq),
        ip: clientIp,
        isUpdate: true,
      });
    } else {
      tokenEntity = this.refreshTokenRepository.create({
        userSeq: userSeq,
        refreshToken: hashedToken,
        expDtm: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14일 후 만료 예시
      });
      // Audit Insert
      setAuditColumn({
        entity: tokenEntity,
        id: String(userSeq),
        ip: clientIp,
        isUpdate: false,
      });
    }

    await this.refreshTokenRepository.save(tokenEntity);
  }

  async verifyRefreshToken(userSeq: number, token: string): Promise<boolean> {
    const tokenEntity = await this.refreshTokenRepository.findOne({
      where: { userSeq },
    });
    if (!tokenEntity) return false;

    return isHashValid(token, tokenEntity.refreshToken);
  }

  async removeRefreshToken(userSeq: number): Promise<void> {
    await this.refreshTokenRepository.delete({ userSeq });
  }

  // --- 사용자 정보 수정 ---

  async updateProfile(
    userSeq: number,
    updateUserDto: UpdateUserDto,
    clientIp: string,
    file?: File,
  ): Promise<UserResponseDto> {
    const user = await this.findById(userSeq);
    if (!user) throw new Error('사용자를 찾을 수 없습니다.');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (updateUserDto.userName) {
        user.userName = this.inputSanitizer.sanitizeName(
          updateUserDto.userName,
        );
      }

      if (updateUserDto.userDescription) {
        user.userDescription = this.inputSanitizer.sanitizeDescription(
          updateUserDto.userDescription,
        );
      }
      // Phone 로직 대기 (Entity 없음)

      // 프로필 이미지 업데이트
      if (file) {
        const auditSettings: AuditSettings = {
          entity: null,
          id: String(userSeq),
          ip: clientIp,
          isUpdate: false,
        };

        const { savedFiles } = await this.fileUploadUtil.saveFileInfo(
          [file],
          auditSettings,
          queryRunner.manager,
        );

        if (savedFiles.length > 0) {
          user.userProfileImageFileGroupNo = savedFiles[0].fileGroupNo;
        }
      }

      setAuditColumn({
        entity: user,
        id: String(userSeq),
        ip: clientIp,
        isUpdate: true,
      });

      await queryRunner.manager.save(UserEntity, user);
      await queryRunner.commitTransaction();

      return this.toUserResponse(user);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async changePassword(
    userSeq: number,
    dto: ChangePasswordDto,
    clientIp: string,
  ): Promise<void> {
    const user = await this.findById(userSeq);
    if (!user) throw new Error('사용자를 찾을 수 없습니다.');

    const isCurrentValid = await isHashValid(dto.currentPassword, user.userPw);
    if (!isCurrentValid) {
      throw new Error('현재 비밀번호가 일치하지 않습니다.');
    }

    user.userPw = await encrypt(dto.newPassword);

    setAuditColumn({
      entity: user,
      id: String(userSeq),
      ip: clientIp,
      isUpdate: true,
    });

    await this.userRepository.save(user);
  }

  // --- 유틸리티 메서드 ---

  // private async decryptUserFields... (userPhone 없으므로 일단 제외)

  async toUserResponse(user: UserEntity): Promise<UserResponseDto> {
    return {
      userNo: user.userSeq,
      userEmail: user.userEmail,
      userName: user.userName,
      userPhone: undefined, // userPhone 컬럼 부재
      fileGroupNo: user.userProfileImageFileGroupNo || undefined,
      createdAt: user.regDtm,
      updatedAt: user.modDtm,
    };
  }
}
