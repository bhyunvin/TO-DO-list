import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  Ip,
  Session,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  Patch,
  UsePipes,
  ValidationPipe,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Session as SessionInterface, SessionData } from 'express-session';
import { FileInterceptor } from '@nestjs/platform-express';
import { profileImageMulterOptions } from '../fileUpload/fileUploadUtil';
import { ProfileImageValidationInterceptor } from '../fileUpload/validation/file-validation.interceptor';
import { FileUploadErrorService } from '../fileUpload/validation/file-upload-error.service';

import { UserService } from './user.service';
import { UserDto, UpdateUserDto, ChangePasswordDto } from './user.dto';
import { UserEntity } from './user.entity';
import { UserProfileValidationPipe } from './user-validation.pipe';

import { AuthenticatedGuard } from '../../types/express/auth.guard';

@Controller('user')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(
    private readonly userService: UserService,
    private readonly fileUploadErrorService: FileUploadErrorService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Session() session: SessionInterface & SessionData, // SessionInterface로 타입 보강
    @Body() userDto: UserDto,
  ): Promise<Omit<UserEntity, 'userPassword' | 'setProfileImage'>> {
    // Promise<void> 대신 사용자 정보 반환 유지
    const user = await this.userService.login(userDto);
    session.user = user; // 서비스에서 반환된 사용자 정보를 세션에 저장

    return new Promise((resolve, reject) => {
      session.save((err) => {
        if (err) {
          this.logger.error('Session save error', err);
          return reject(new Error('세션 저장에 실패했습니다.'));
        }

        // 간단히 클라이언트 반환용으로 복사본 생성 후 복호화 및 마스킹
        const userForClient = { ...user };
        resolve(this.userService.getPublicUserInfo(userForClient));
      });
    });
  }

  @Get('duplicate/:userId')
  async checkIdDuplicated(@Param('userId') userId: string): Promise<boolean> {
    return await this.userService.checkIdDuplicated(userId);
  }

  @Post('signup')
  @UseInterceptors(
    FileInterceptor('profileImage', profileImageMulterOptions),
    ProfileImageValidationInterceptor,
  )
  async signup(
    @Body() userDto: UserDto,
    @UploadedFile() profileImageFile: Express.Multer.File,
    @Ip() ip: string,
  ): Promise<UserDto | null> {
    try {
      const result = await this.userService.signup(
        userDto,
        profileImageFile,
        ip,
      );

      // 파일 업로드와 함께 성공적인 회원가입 로깅
      if (profileImageFile) {
        const { originalname, size } = profileImageFile;
        const errorContext = this.fileUploadErrorService.extractErrorContext(
          {
            ip,
            get: () => '',
            headers: {},
            method: 'POST',
            path: '/user/signup',
          } as any,
          'profile_image',
          result?.userSeq,
        );

        this.fileUploadErrorService.logSuccessfulUpload(
          [
            {
              originalFileName: originalname,
              fileSize: size,
            },
          ],
          errorContext,
        );
      }

      return this.userService.getPublicUserInfo(result);
    } catch (error) {
      const { userId } = userDto;
      const { message } = error;
      this.logger.error('Profile image upload failed during signup', {
        userId,
        error: message,
        fileName: profileImageFile?.originalname,
        fileSize: profileImageFile?.size,
      });

      // 전역 예외 필터에서 처리하도록 오류 재발생
      throw error;
    }
  }

  @UseGuards(AuthenticatedGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Session() session: SessionInterface): void {
    session.destroy(() => {
      // 로그아웃 처리 중 에러 발생 시 처리 로직을 추가할 수 있습니다.
    });
  }

  @UseGuards(AuthenticatedGuard)
  @Patch('profile')
  @UseInterceptors(
    FileInterceptor('profileImage', profileImageMulterOptions),
    ProfileImageValidationInterceptor,
  )
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async updateProfile(
    @Session() session: SessionInterface & SessionData,
    @Body(UserProfileValidationPipe) updateUserDto: UpdateUserDto,
    @UploadedFile() profileImageFile: Express.Multer.File,
    @Ip() ip: string,
  ): Promise<Omit<UserEntity, 'userPassword' | 'setProfileImage'>> {
    try {
      // 향상된 인증 및 권한 검사
      const currentUser = session.user;
      const { id: sessionId } = session;

      if (!currentUser || !currentUser.userSeq) {
        this.logger.warn('Profile update attempted without valid session', {
          sessionId,
          ip,
        });
        throw new UnauthorizedException(
          '유효한 세션이 없습니다. 다시 로그인해주세요.',
        );
      }

      const { userSeq, userId } = currentUser;

      if (!userId) {
        this.logger.warn(
          'Profile update attempted with incomplete session data',
          {
            userSeq,
            sessionId,
            ip,
          },
        );
        throw new UnauthorizedException(
          '세션 데이터가 불완전합니다. 다시 로그인해주세요.',
        );
      }

      this.logger.log('Profile update attempt', {
        userSeq,
        userId,
        updateFields: Object.keys(updateUserDto),
        hasProfileImage: !!profileImageFile,
        ip,
        sessionId,
      });

      const { lastProfileUpdate: lastUpdateTime } = session;
      const now = Date.now();
      const minUpdateInterval = 60 * 1000; // 업데이트 간 최소 1분

      if (lastUpdateTime && now - lastUpdateTime < minUpdateInterval) {
        const remainingSeconds = Math.ceil(
          (minUpdateInterval - (now - lastUpdateTime)) / 1000,
        );
        this.logger.warn('Profile update rate limit exceeded', {
          userSeq,
          lastUpdate: new Date(lastUpdateTime),
          timeSinceLastUpdate: now - lastUpdateTime,
          ip,
        });
        throw new ForbiddenException(
          `프로필 업데이트가 너무 빈번합니다. ${remainingSeconds}초 후에 다시 시도해주세요.`,
        );
      }

      const updatedUser = await this.userService.updateProfile(
        userSeq,
        updateUserDto,
        profileImageFile,
        ip,
      );

      session.user = updatedUser;
      session.lastProfileUpdate = now;

      return new Promise((resolve, reject) => {
        session.save((err) => {
          if (err) {
            const { message } = err;
            this.logger.error('Session save error during profile update', {
              userSeq,
              error: message,
              ip,
            });
            return reject(new Error('세션 저장에 실패했습니다.'));
          }

          const { userId: updatedUserId } = updatedUser;
          this.logger.log('Profile update completed successfully', {
            userSeq,
            userId: updatedUserId,
            updatedFields: Object.keys(updateUserDto),
            hasNewProfileImage: !!profileImageFile,
            ip,
          });

          // 클라이언트 반환용 복사본 생성 후 복호화 및 마스킹
          const userForClient = { ...updatedUser };
          // UserEntity 타입 캐스팅 필요 없음 (UserService에서 Generics 지원)
          resolve(this.userService.getPublicUserInfo(userForClient));
        });
      });
    } catch (error) {
      const { message } = error;
      const { id: sessionId } = session;
      this.logger.error('Profile update failed', {
        userSeq: session.user?.userSeq,
        userId: session.user?.userId,
        error: message,
        fileName: profileImageFile?.originalname,
        fileSize: profileImageFile?.size,
        ip,
        sessionId,
      });

      // 전역 예외 필터에서 처리하도록 오류 재발생
      throw error;
    }
  }

  @UseGuards(AuthenticatedGuard)
  @Patch('password')
  @HttpCode(HttpStatus.OK)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async changePassword(
    @Session() session: SessionInterface & SessionData,
    @Body() changePasswordDto: ChangePasswordDto,
    @Ip() ip: string,
  ): Promise<{ message: string }> {
    try {
      // 향상된 인증 검사
      const currentUser = session.user;
      const { id: sessionId } = session;

      if (!currentUser || !currentUser.userSeq) {
        this.logger.warn('Password change attempted without valid session', {
          sessionId,
          ip,
        });
        throw new UnauthorizedException(
          '유효한 세션이 없습니다. 다시 로그인해주세요.',
        );
      }

      const { userSeq, userId } = currentUser;

      if (!userId) {
        this.logger.warn(
          'Password change attempted with incomplete session data',
          {
            userSeq,
            sessionId,
            ip,
          },
        );
        throw new UnauthorizedException(
          '세션 데이터가 불완전합니다. 다시 로그인해주세요.',
        );
      }

      this.logger.log('Password change attempt', {
        userSeq,
        userId,
        ip,
        sessionId,
      });

      const { lastPasswordChange } = session;
      const now = Date.now();
      const minChangeInterval = 300000; // 비밀번호 변경 간 최소 5분

      if (lastPasswordChange && now - lastPasswordChange < minChangeInterval) {
        this.logger.warn('Password change rate limit exceeded', {
          userSeq,
          lastChange: new Date(lastPasswordChange),
          timeSinceLastChange: now - lastPasswordChange,
          ip,
        });
        throw new ForbiddenException(
          '비밀번호 변경이 너무 빈번합니다. 5분 후 다시 시도해주세요.',
        );
      }

      await this.userService.changePassword(userSeq, changePasswordDto, ip);

      session.lastPasswordChange = now;

      return new Promise((resolve, reject) => {
        session.save((err) => {
          if (err) {
            const { message } = err;
            this.logger.error('Session save error during password change', {
              userSeq,
              error: message,
              ip,
            });
            return reject(new Error('세션 저장에 실패했습니다.'));
          }

          this.logger.log('Password change completed successfully', {
            userSeq,
            userId,
            ip,
          });

          resolve({ message: '비밀번호가 성공적으로 변경되었습니다.' });
        });
      });
    } catch (error) {
      const { message } = error;
      const { id: sessionId } = session;
      this.logger.error('Password change failed', {
        userSeq: session.user?.userSeq,
        userId: session.user?.userId,
        error: message,
        ip,
        sessionId,
      });

      // 전역 예외 필터에서 처리하도록 오류 재발생
      throw error;
    }
  }

  @UseGuards(AuthenticatedGuard)
  @Get('profile')
  getProfile(@Session() session: SessionInterface & SessionData) {
    const { user } = session;
    if (!user) {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }
    // 세션의 사용자 정보(암호화 상태)를 복호화하여 반환
    // 세션 객체 자체를 수정하지 않도록 복사본 사용
    const userForClient = { ...user };
    return this.userService.getPublicUserInfo(userForClient);
  }

  @UseGuards(AuthenticatedGuard)
  @Get('profile/detail')
  getProfileDetail(@Session() session: SessionInterface & SessionData) {
    const { user } = session;
    if (!user) {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }
    // 세션 객체 자체를 수정하지 않도록 복사본 사용
    const userForClient = { ...user };
    return this.userService.decryptUserInfo(userForClient);
  }
}
