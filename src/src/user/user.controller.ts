import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  Ip,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../fileUpload/fileUploadUtil';

import { UserService } from './user.service';
import { UserDto } from './user.dto';
import { UserEntity } from './user.entity';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  //로그인
  @Post('login')
  async getUserInfo(
    @Body() userDto: UserDto,
  ): Promise<UserEntity | { message: string }> {
    return await this.userService.getUserOneInfo(userDto);
  }

  //아이디 중복체크
  @Get('duplicate/:userId')
  async checkIdDuplicated(@Param('userId') userId: string): Promise<boolean> {
    return await this.userService.checkIdDuplicated(userId);
  }

  //회원가입
  @Post('signup')
  @UseInterceptors(FileInterceptor('profileImage', multerOptions))
  async signup(
    @Body() userDto: UserDto,
    @UploadedFile() profileImageFile: Express.Multer.File[],
    @Ip() ip: string,
  ): Promise<UserDto | null> {
    return await this.userService.signup(userDto, profileImageFile, ip);
  }
}
