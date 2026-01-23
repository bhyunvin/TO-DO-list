import { Elysia } from 'elysia';
import { jwtPlugin } from '../../plugins/jwt';
import { databasePlugin } from '../../plugins/database';
import { MailService } from './mail.service';
import { UserService } from '../user/user.service';
import { CloudinaryService } from '../../fileUpload/cloudinary.service';
import { ContactEmailSchema } from './mail.schema';

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
      const userInfo = await userService.findById(Number(user!.id));
      if (!userInfo) throw new Error('User not found');

      // 유저 정보 복호화 로직은 UserService에 있어야 함 (getUser vs findById).
      // UserService.findById는 복호화된 정보를 반환하는가?
      // user.service.ts를 보면 toUserResponse에서 복호화된 이메일을 사용하거나,
      // create/update시 평문 저장인지 확인 필요.
      // cryptUtil을 사용하므로 DB엔 암호화되어 있을 수 있음.
      // UserService의 findById가 Entity를 반환한다면 암호화된 상태일 수 있음.
      // Entity에서 userEmail은 암호화된 컬럼인가? 스키마엔 일반 string.
      // 기존 MailController에서는 userService.decryptUserInfo를 호출함.
      // 현재 UserService에 decryptUserInfo 메서드가 있는지 확인해야 함.

      // user.service.ts 분석 시 decryptUserInfo를 옮겼는지 확인 못함.
      // 만약 없다면 평문 이메일을 jwt payload (sub, email, name)에서 가져오는 게 나음.
      // jwtPlugin은 payload.email을 user.email로 매핑함.

      const userEmail = user!.email || userInfo.userEmail; // JWT에 이메일이 있다면 사용

      await mailService.sendContactEmail(
        userEmail,
        body.title,
        body.content,
        body.file,
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
