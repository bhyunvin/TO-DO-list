import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { MailService } from './mail.service';
import { AuthenticatedGuard } from '../types/express/auth.guard';
import { ContactEmailDto } from './dto/contact-email.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from '../user/user.service';

@Controller('mail')
export class MailController {
  constructor(
    private readonly mailService: MailService,
    private readonly userService: UserService,
  ) {}

  @Post('contact')
  @UseGuards(AuthenticatedGuard)
  @UseInterceptors(FileInterceptor('file')) // 'file'은 클라이언트 FormData의 키 값
  async sendContactEmail(
    @Req() req,
    @Body() contactDto: ContactEmailDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const { userSeq } = req.user;
    const user = await this.userService.getUser(userSeq);
    const decryptedUser = await this.userService.decryptUserInfo(user);
    const userEmail = decryptedUser.userEmail;

    await this.mailService.sendContactEmail(userEmail, contactDto, file);
    return { success: true, message: '문의 메일이 성공적으로 발송되었습니다.' };
  }
}
