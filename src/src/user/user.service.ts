import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Request, Response } from 'express';
import { UserEntity } from './user.entity';
import { UserDto } from './user.dto';
import { encrypt, isHashValid } from '../utils/cryptUtil';
import { FileUploadUtil } from '../fileUpload/fileUploadUtil';
import { setAuditColumn } from '../utils/auditColumns';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    private fileUploadUtil: FileUploadUtil,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  //사용자 1명 조회
  async getUserOneInfo(
    req: Request,
    userDto: UserDto,
  ): Promise<UserEntity | { message: string }> {
    this.logger.log(`Login DTO received: ${JSON.stringify(userDto)}`);
    const selectedUser = await this.userRepository.findOne({
      where: { userId: userDto.userId },
    });
    if (!selectedUser) {
      return { message: '아이디나 비밀번호가 다릅니다.' };
    }

    const isPasswordMatch = await isHashValid(
      userDto.userPassword,
      selectedUser.userPassword,
    );
    if (!isPasswordMatch) {
      return { message: '아이디나 비밀번호가 다릅니다.' };
    }

    // 세션에 사용자 정보 저장
    req.session.userSeq = selectedUser.userSeq;
    req.session.userId = selectedUser.userId;
    this.logger.log(`User ${selectedUser.userId} logged in, session saved.`);

    return selectedUser;
  }

  //ID 중복체크
  async checkIdDuplicated(userId: string): Promise<boolean> {
    const selectedUser = await this.userRepository.findOne({
      where: { userId },
    });
    return !!selectedUser;
  }

  //회원가입
  async signup(
    userDto: UserDto,
    profileImageFile: Express.Multer.File,
    ip: string,
  ): Promise<UserDto> {
    this.logger.log(`Signup DTO received: ${JSON.stringify(userDto)}`);
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
        const fileUploadResult = await this.fileUploadUtil.saveFileInfo(
          [profileImageFile], // saveFileInfo expects an array
          { entity: null, id: userDto.userId, ip },
        );
        userDto.userProfileImageFileGroupNo = fileUploadResult.fileGroupNo;

        // 프로필 이미지 정보로 유저 정보를 업데이트합니다.
        savedUser.userProfileImageFileGroupNo =
          userDto.userProfileImageFileGroupNo;
        await transactionalEntityManager.save(UserEntity, savedUser);
      }

      return savedUser;
    });
  }

  //로그아웃
  async logout(req: Request, res: Response): Promise<Response> {
    return new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) {
          this.logger.error('Session destruction error:', err);
          return reject(res.status(500).send('Could not log out.'));
        }
        res.clearCookie('connect.sid'); // 세션 쿠키 삭제
        this.logger.log('Session destroyed and user logged out.');
        return resolve(res.status(200).send({ message: 'Logged out' }));
      });
    });
  }
}
