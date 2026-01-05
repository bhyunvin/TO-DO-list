import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  Ip,
  UnauthorizedException,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { profileImageMulterOptions } from '../fileUpload/fileUploadUtil';
import { ProfileImageValidationInterceptor } from '../fileUpload/validation/file-validation.interceptor';
import { FileUploadErrorService } from '../fileUpload/validation/file-upload-error.service';

import { UserService } from './user.service';
import {
  UserDto,
  UpdateUserDto,
  ChangePasswordDto,
  LoginDto,
} from './user.dto';
import { UserEntity } from './user.entity';
import { UserProfileValidationPipe } from './user-validation.pipe';

import { AuthenticatedGuard } from '../types/express/auth.guard';
import { AuthService } from '../types/express/auth.service';

@Controller('user')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(
    private readonly userService: UserService,
    private readonly fileUploadErrorService: FileUploadErrorService,
    private readonly authService: AuthService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<{
    access_token: string;
    user: Omit<UserEntity, 'userPassword' | 'setProfileImage'>;
  }> {
    const user = await this.userService.login(loginDto);
    const { access_token } = await this.authService.login(user);

    // 간단히 클라이언트 반환용으로 복사본 생성 후 복호화 및 마스킹
    const userForClient = { ...user };
    const publicUser = this.userService.getPublicUserInfo(userForClient);

    return {
      access_token,
      user: publicUser,
    };
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
  logout(): void {
    // JWT는 상태가 없으므로 서버측 로그아웃 로직은 필요 없습니다.
    // 클라이언트에서 토큰을 폐기해야 합니다.
  }

  @UseGuards(AuthenticatedGuard)
  @Patch('profile')
  @UseInterceptors(
    FileInterceptor('profileImage', profileImageMulterOptions),
    ProfileImageValidationInterceptor,
  )
  async updateProfile(
    @Req() req: Request,
    @Body(UserProfileValidationPipe) updateUserDto: UpdateUserDto,
    @UploadedFile() profileImageFile: Express.Multer.File,
    @Ip() ip: string,
  ): Promise<Omit<UserEntity, 'userPassword' | 'setProfileImage'>> {
    try {
      const user = req.user as any;
      if (!user?.userSeq) {
        throw new UnauthorizedException('로그인이 필요합니다.');
      }
      const { userSeq, userId } = user;

      this.logger.log('Profile update attempt', {
        userSeq,
        userId,
        updateFields: Object.keys(updateUserDto),
        hasProfileImage: !!profileImageFile,
        ip,
      });

      const updatedUser = await this.userService.updateProfile(
        userSeq,
        updateUserDto,
        profileImageFile,
        ip,
      );

      const { userId: updatedUserId } = updatedUser;
      this.logger.log('Profile update completed successfully', {
        userSeq,
        userId: updatedUserId,
        updatedFields: Object.keys(updateUserDto),
        hasNewProfileImage: !!profileImageFile,
        ip,
      });

      const userForClient = { ...updatedUser };
      return this.userService.getPublicUserInfo(userForClient);
    } catch (error) {
      const { message } = error;
      const user = req.user as any;
      this.logger.error('Profile update failed', {
        userSeq: user?.userSeq,
        userId: user?.userId,
        error: message,
        fileName: profileImageFile?.originalname,
        fileSize: profileImageFile?.size,
        ip,
      });

      throw error;
    }
  }

  @UseGuards(AuthenticatedGuard)
  @Patch('password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Req() req: Request,
    @Body() changePasswordDto: ChangePasswordDto,
    @Ip() ip: string,
  ): Promise<{ message: string }> {
    try {
      const user = req.user as any;
      if (!user?.userSeq) {
        throw new UnauthorizedException('로그인이 필요합니다.');
      }
      const { userSeq, userId } = user;

      this.logger.log('Password change attempt', {
        userSeq,
        userId,
        ip,
      });

      await this.userService.changePassword(userSeq, changePasswordDto, ip);

      this.logger.log('Password change completed successfully', {
        userSeq,
        userId,
        ip,
      });

      return { message: '비밀번호가 성공적으로 변경되었습니다.' };
    } catch (error) {
      const { message } = error;
      const user = req.user as any;
      this.logger.error('Password change failed', {
        userSeq: user?.userSeq,
        userId: user?.userId,
        error: message,
        ip,
      });

      throw error;
    }
  }

  @UseGuards(AuthenticatedGuard)
  @Get('profile')
  async getProfile(@Req() req: Request) {
    const user = req.user as any;
    if (!user) {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }
    const fullUser = await this.userService.getUser(user.userSeq);
    const userForClient = { ...fullUser };
    return this.userService.getPublicUserInfo(userForClient);
  }

  @UseGuards(AuthenticatedGuard)
  @Get('profile/detail')
  async getProfileDetail(@Req() req: Request) {
    const user = req.user as any;
    if (!user) {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }
    const fullUser = await this.userService.getUser(user.userSeq);
    const userForClient = { ...fullUser };
    return this.userService.decryptUserInfo(userForClient);
  }
}
