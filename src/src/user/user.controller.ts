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
} from '@nestjs/common';
import { Session as SessionInterface, SessionData } from 'express-session';
import { FileInterceptor } from '@nestjs/platform-express';
import { profileImageMulterOptions } from '../fileUpload/fileUploadUtil';
import { ProfileImageValidationInterceptor } from '../fileUpload/validation/file-validation.interceptor';
import { FileUploadErrorService } from '../fileUpload/validation/file-upload-error.service';

import { UserService } from './user.service';
import { UserDto, UpdateUserDto } from './user.dto';
import { UserEntity } from './user.entity';

import { AuthenticatedGuard } from '../../types/express/auth.guard';

@Controller('user')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(
    private readonly userService: UserService,
    private readonly fileUploadErrorService: FileUploadErrorService,
  ) {}

  //로그인
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Session() session: SessionInterface & SessionData, // SessionInterface로 타입 보강
    @Body() userDto: UserDto,
  ): Promise<Omit<UserEntity, 'userPassword'>> {
    // Promise<void> 대신 사용자 정보 반환 유지
    const user = await this.userService.login(userDto);
    session.user = user; // 서비스에서 반환된 사용자 정보를 세션에 저장

    return new Promise((resolve, reject) => {
      session.save((err) => {
        if (err) {
          this.logger.error('Session save error', err);
          return reject(new Error('세션 저장에 실패했습니다.'));
        }
        resolve(user);
      });
    });
  }

  //아이디 중복체크
  @Get('duplicate/:userId')
  async checkIdDuplicated(@Param('userId') userId: string): Promise<boolean> {
    return await this.userService.checkIdDuplicated(userId);
  }

  //회원가입
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
      const result = await this.userService.signup(userDto, profileImageFile, ip);
      
      // Log successful signup with file upload
      if (profileImageFile) {
        const errorContext = this.fileUploadErrorService.extractErrorContext(
          { ip, get: () => '', headers: {}, method: 'POST', path: '/user/signup' } as any,
          'profile_image',
          result?.userSeq,
        );
        
        this.fileUploadErrorService.logSuccessfulUpload(
          [{ originalFileName: profileImageFile.originalname, fileSize: profileImageFile.size }],
          errorContext,
        );
      }
      
      return result;
    } catch (error) {
      this.logger.error('Profile image upload failed during signup', {
        userId: userDto.userId,
        error: error.message,
        fileName: profileImageFile?.originalname,
        fileSize: profileImageFile?.size,
      });
      
      // Re-throw the error to be handled by global exception filter
      throw error;
    }
  }

  //로그아웃
  @UseGuards(AuthenticatedGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Session() session: SessionInterface): void {
    session.destroy((err) => {
      // 로그아웃 처리 중 에러 발생 시 처리 로직을 추가할 수 있습니다.
    });
  }

  //프로필 업데이트
  @UseGuards(AuthenticatedGuard)
  @Patch('profile')
  @UseInterceptors(
    FileInterceptor('profileImage', profileImageMulterOptions),
    ProfileImageValidationInterceptor,
  )
  async updateProfile(
    @Session() session: SessionInterface & SessionData,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() profileImageFile: Express.Multer.File,
    @Ip() ip: string,
  ): Promise<Omit<UserEntity, 'userPassword'>> {
    try {
      const userSeq = session.user?.userSeq;
      if (!userSeq) {
        throw new Error('User session not found');
      }

      const updatedUser = await this.userService.updateProfile(
        userSeq,
        updateUserDto,
        profileImageFile,
        ip,
      );

      // Update session with new user data
      session.user = updatedUser;

      return new Promise((resolve, reject) => {
        session.save((err) => {
          if (err) {
            this.logger.error('Session save error during profile update', err);
            return reject(new Error('세션 저장에 실패했습니다.'));
          }
          resolve(updatedUser);
        });
      });
    } catch (error) {
      this.logger.error('Profile update failed', {
        userSeq: session.user?.userSeq,
        error: error.message,
        fileName: profileImageFile?.originalname,
        fileSize: profileImageFile?.size,
      });

      // Re-throw the error to be handled by global exception filter
      throw error;
    }
  }
}
