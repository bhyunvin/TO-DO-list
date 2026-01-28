import { Elysia } from 'elysia';
import { jwtPlugin } from '../../plugins/jwt';
import { databasePlugin } from '../../plugins/database';
import { MailService } from './mail.service';
import { UserService } from '../user/user.service';
import { CloudinaryService } from '../../fileUpload/cloudinary.service';
import { ContactEmailSchema, ContactEmailDto } from './mail.schema';

export const mailRoutes = new Elysia({ prefix: '/mail' })
  .use(databasePlugin)
  .use(jwtPlugin)
  .derive(({ db }) => ({
    mailService: new MailService(),
    userService: new UserService(db, new CloudinaryService()),
  }))
  .onBeforeHandle(({ user }) => {
    if (!user) throw new Error('Unauthorized');
  })

  // 문의 메일 발송
  .post(
    '/contact',
    async ({ user, body, mailService, userService }) => {
      // 사용자 정보 조회 (이메일 획득용)
      const userInfo = await userService.findById(Number(user.id));
      if (!userInfo) throw new Error('User not found');

      const userEmail = user.email || userInfo.userEmail;

      const emailBody = body as ContactEmailDto;
      await mailService.sendContactEmail(
        userEmail,
        emailBody.title,
        emailBody.content,
        emailBody.file,
      );

      return {
        success: true,
        message: '문의 메일이 성공적으로 발송되었습니다.',
      };
    },
    {
      body: ContactEmailSchema,
      detail: {
        tags: ['Mail'],
        summary: '문의 메일 발송',
      },
    },
  );
