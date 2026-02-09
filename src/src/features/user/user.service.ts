import { Repository, DataSource } from 'typeorm';
import { UserEntity } from './user.entity';
import { RefreshTokenEntity } from './refresh-token.entity';
import { FileInfoEntity } from '../../fileUpload/file.entity';
import { FileUploadUtil } from '../../fileUpload/fileUploadUtil';
import { InputSanitizerService } from '../../utils/inputSanitizer';
import {
  encrypt,
  isHashValid,
  encryptSymmetric,
  decryptSymmetric,
  encryptSymmetricDeterministic,
  decryptSymmetricDeterministic,
} from '../../utils/cryptUtil';
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

  async checkDuplicateId(userId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { userId } });
    return !!user;
  }

  // --- 암호화/복호화 메서드 ---

  /**
   * 사용자 정보 복호화
   * - 이메일: 결정적 암호화 복호화
   * - API Key: 일반 양방향 암호화 복호화
   */
  async decryptUserInfo<T extends Partial<UserEntity>>(user: T): Promise<T> {
    if (!user) return user;

    // 이메일 복호화 (결정적 암호화 사용)
    if (user.userEmail) {
      user.userEmail = await decryptSymmetricDeterministic(user.userEmail);
    }

    // API Key 복호화 (일반 양방향 암호화 사용)
    if (user.aiApiKey) {
      user.aiApiKey = await decryptSymmetric(user.aiApiKey);
    }

    return user;
  }

  /**
   * 공개 사용자 정보 반환 (민감 정보 제외)
   * - API Key 등의 민감 정보를 제외하고 반환
   */
  getPublicUserInfo<T extends Partial<UserEntity>>(user: T): Partial<T> {
    if (!user) return user;

    // API Key와 같은 민감 정보 제외
    const { aiApiKey: _aiApiKey, userPw: _userPw, ...publicInfo } = user;
    return publicInfo as Partial<T>;
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
      const {
        userId,
        userEmail,
        userPw,
        userName,
        userDescription,
        privacyAgreed,
      } = registerDto;

      // 1. 이메일 암호화 및 중복 확인
      const encryptedEmail = await encryptSymmetricDeterministic(userEmail);
      const existingUser = await queryRunner.manager.findOne(UserEntity, {
        where: { userEmail: encryptedEmail },
      });
      if (existingUser) {
        throw new Error('이미 존재하는 이메일입니다.');
      }

      // 아이디 중복 확인
      const existingId = await queryRunner.manager.findOne(UserEntity, {
        where: { userId },
      });
      if (existingId) {
        throw new Error('이미 존재하는 아이디입니다.');
      }

      // 2. 비밀번호 해싱
      const hashedPassword = await encrypt(userPw);

      // 3. 사용자 엔티티 생성
      const newUser = queryRunner.manager.create(UserEntity, {
        userId,
        userEmail: encryptedEmail, // 암호화된 이메일 저장
        userPw: hashedPassword,
        userName: this.inputSanitizer.sanitizeName(userName),
        adminYn: 'N',
        userDescription: userDescription
          ? this.inputSanitizer.sanitizeDescription(userDescription)
          : '',
        privacyAgreedDtm: privacyAgreed ? new Date() : null,
      });

      // Audit 설정
      const auditSettings: AuditSettings = {
        entity: newUser,
        id: userId, // 회원가입 시에는 입력받은 userId 사용
        ip: clientIp,
        isUpdate: false,
      };
      setAuditColumn(auditSettings);

      const savedUser = await queryRunner.manager.save(UserEntity, newUser);

      // 4. 프로필 이미지 업로드 (파일이 있는 경우)
      if (file) {
        const fileAuditSettings: AuditSettings = {
          entity: null, // 내부에서 생성됨
          id: userId,
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
            id: userId,
            ip: clientIp,
            isUpdate: true,
          };
          setAuditColumn(updateAuditSettings);

          await queryRunner.manager.save(UserEntity, savedUser);
        }
      }

      await queryRunner.commitTransaction();

      // 응답 생성을 위해 복호화 (메모리 상 객체만)
      if (savedUser.userEmail) {
        savedUser.userEmail = await decryptSymmetricDeterministic(
          savedUser.userEmail,
        );
      }

      return this.toUserResponse(savedUser);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async login(loginDto: LoginDto): Promise<UserEntity> {
    const { userId, userPw } = loginDto;

    // 아이디로 조회
    const user = await this.userRepository.findOne({
      where: { userId },
    });

    if (!user) {
      throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
    }

    const isPwValid = await isHashValid(userPw, user.userPw);
    if (!isPwValid) {
      throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
    }

    // 사용자 정보 복호화 후 반환
    return await this.decryptUserInfo(user);
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
      // 감사 정보 업데이트 (Audit Update)
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
      // 감사 정보 삽입 (Audit Insert)
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
      // 이메일 업데이트 (암호화 및 중복 체크)
      if (updateUserDto.userEmail) {
        await this.handleEmailUpdate(user, updateUserDto.userEmail);
      }
      if (updateUserDto.userName) {
        user.userName = this.inputSanitizer.sanitizeName(
          updateUserDto.userName,
        );
      }

      if (updateUserDto.userDescription !== undefined) {
        user.userDescription = updateUserDto.userDescription
          ? this.inputSanitizer.sanitizeDescription(
              updateUserDto.userDescription,
            )
          : null;
      }

      // API Key 업데이트 (암호화)
      if (updateUserDto.aiApiKey !== undefined) {
        if (updateUserDto.aiApiKey === '' || updateUserDto.aiApiKey === null) {
          // 빈 문자열이나 null이면 삭제
          user.aiApiKey = null;
        } else {
          // 암호화하여 저장
          user.aiApiKey = await encryptSymmetric(updateUserDto.aiApiKey);
        }
      }

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

  private async handleEmailUpdate(
    user: UserEntity,
    newEmail: string,
  ): Promise<void> {
    // 1. 이메일 정제
    const sanitizedEmail = this.inputSanitizer.sanitizeEmail(newEmail);

    // 2. 결정적 암호화 (신규 포맷 표준화)
    const encryptedEmail = await encryptSymmetricDeterministic(sanitizedEmail);

    // 3. 변경 여부 확인
    if (user.userEmail !== encryptedEmail) {
      // 4. 중복 체크
      const existingUser = await this.userRepository.findOne({
        where: { userEmail: encryptedEmail },
      });

      if (existingUser && existingUser.userSeq !== user.userSeq) {
        throw new Error('이미 존재하는 이메일입니다.');
      }

      user.userEmail = encryptedEmail;
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

  async toUserResponse(user: Partial<UserEntity>): Promise<UserResponseDto> {
    if (!user.userSeq) {
      throw new Error('User sequence is missing');
    }
    return {
      userSeq: user.userSeq,
      userId: user.userId || '',
      userEmail: user.userEmail || '',
      userName: user.userName || '',
      userDescription: user.userDescription || null,
      profileImage: user.profileImage || null,
      fileGroupNo: user.userProfileImageFileGroupNo || null,
      createdAt: user.auditColumns?.regDtm,
      updatedAt: user.auditColumns?.updDtm,
      hasAiApiKey: !!user.aiApiKey,
    };
  }
}
