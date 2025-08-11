import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  Ip,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
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
    @Req() req: Request,
    @Body() userDto: UserDto,
  ): Promise<UserEntity | { message: string }> {
    return await this.userService.getUserOneInfo(req, userDto);
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
    @UploadedFile() profileImageFile: Express.Multer.File,
    @Ip() ip: string,
  ): Promise<UserDto | null> {
    return await this.userService.signup(userDto, profileImageFile, ip);
  }

  //로그아웃
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response> {
    return await this.userService.logout(req, res);
  }
}
