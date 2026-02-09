import { Elysia } from 'elysia';
import { jwtPlugin, JWTRefreshPayload } from '../../plugins/jwt';
import { databasePlugin } from '../../plugins/database';
import { UserService } from './user.service';
import { CloudinaryService } from '../../fileUpload/cloudinary.service';
import {
  LoginSchema,
  RegisterSchema,
  UpdateUserSchema,
  ChangePasswordSchema,
  ProfileImageUploadSchema,
  LoginResponseSchema,
  DuplicateCheckResponseSchema,
  UserResponseSchema,
  LoginDto,
  RegisterDto,
  ChangePasswordDto,
  ProfileImageUploadDto,
} from './user.schema';

import { getClientIp } from '../../utils/ip.util';

export const userRoutes = new Elysia({ prefix: '/user' })
  .use(databasePlugin)
  .use(jwtPlugin)
  .derive(({ db }) => ({
    userService: new UserService(db, new CloudinaryService()),
  }))

  // 회원가입
  .post(
    '/register',
    async ({ body, userService, set, request }) => {
      const clientIp = getClientIp(request);
      const newUser = await userService.register(body as RegisterDto, clientIp);
      set.status = 201;
      return newUser;
    },
    {
      body: RegisterSchema,
      response: {
        201: UserResponseSchema,
      },
      detail: {
        tags: ['User'],
        summary: '회원가입',
        description: '새로운 사용자를 등록합니다.',
      },
    },
  )

  // 아이디 중복 체크
  .get(
    '/duplicate/:userId',
    async ({ params: { userId }, userService }) => {
      const isDuplicated = await userService.checkDuplicateId(userId);
      return { isDuplicated };
    },
    {
      response: DuplicateCheckResponseSchema,
      detail: {
        tags: ['User'],
        summary: '아이디 중복 체크',
        description: '회원가입 시 아이디 중복 여부를 확인합니다.',
      },
    },
  )

  // 로그인
  .post(
    '/login',
    async ({
      body,
      userService,
      jwt,
      refreshJwt,
      cookie: { refresh_token },
      request,
    }) => {
      const user = await userService.login(body as LoginDto);
      const clientIp = getClientIp(request);

      // 액세스 토큰 생성 (복호화된 이메일 사용)
      const accessToken = await jwt.sign({
        sub: String(user.userSeq),
        email: user.userEmail, // 이미 복호화됨
        name: user.userName,
      });

      // 리프레시 토큰 생성
      const refreshToken = await refreshJwt.sign({
        sub: String(user.userSeq),
      });

      // 리프레시 토큰 저장
      await userService.saveRefreshToken(user.userSeq, refreshToken, clientIp);

      // 쿠키 설정 (HttpOnly)
      refresh_token.value = refreshToken;
      refresh_token.httpOnly = true;
      refresh_token.path = '/';
      refresh_token.secure = process.env.NODE_ENV === 'production'; // HTTPS 환경에서만 true

      // 민감 정보 제외하고 반환
      const publicUser = userService.getPublicUserInfo(user);

      return {
        accessToken,
        user: await userService.toUserResponse(publicUser),
      };
    },
    {
      body: LoginSchema,
      response: LoginResponseSchema,
      detail: {
        tags: ['User'],
        summary: '로그인',
        description: '이메일과 비밀번호로 로그인하고 토큰을 발급받습니다.',
      },
    },
  )

  // 프로필 조회 (인증 필요)
  .get(
    '/profile',
    async ({ user, userService }) => {
      // jwtPlugin의 derive로 인해 user 정보가 존재함 (id는 sub Claim)
      if (!user) throw new Error('Unauthorized');

      const foundUser = await userService.findById(Number(user.id));
      if (!foundUser) throw new Error('User not found');

      // 사용자 정보 복호화
      const decryptedUser = await userService.decryptUserInfo(foundUser);

      // 민감 정보 제외하고 반환
      const publicUser = userService.getPublicUserInfo(decryptedUser);

      return userService.toUserResponse(publicUser);
    },
    {
      response: UserResponseSchema,
      detail: {
        tags: ['User'],
        summary: '내 프로필 조회',
        security: [{ BearerAuth: [] }],
      },
    },
  )

  // 정보 수정
  .patch(
    '/update',
    async ({ user, body, userService, request }) => {
      if (!user) throw new Error('Unauthorized');
      const clientIp = getClientIp(request);
      const updatedUser = await userService.updateProfile(
        Number(user.id),
        body,
        clientIp,
      );
      return updatedUser;
    },
    {
      body: UpdateUserSchema,
      response: UserResponseSchema,
      detail: {
        tags: ['User'],
        summary: '내 정보 수정',
        security: [{ BearerAuth: [] }],
      },
    },
  )

  // 비밀번호 변경
  .patch(
    '/change-password',
    async ({ user, body, userService, request }) => {
      if (!user) throw new Error('Unauthorized');
      const clientIp = getClientIp(request);
      await userService.changePassword(
        Number(user.id),
        body as ChangePasswordDto,
        clientIp,
      );
      return { success: true };
    },
    {
      body: ChangePasswordSchema,
      detail: {
        tags: ['User'],
        summary: '비밀번호 변경',
        security: [{ BearerAuth: [] }],
      },
    },
  )

  // 로그아웃
  .post(
    '/logout',
    async ({ user, userService, cookie: { refresh_token } }) => {
      if (user?.id) {
        await userService.removeRefreshToken(Number(user.id));
      }
      refresh_token.remove();
      return { success: true };
    },
    {
      detail: {
        tags: ['User'],
        summary: '로그아웃',
        security: [{ BearerAuth: [] }],
      },
    },
  )

  // 리프레시 토큰 재발급
  .post(
    '/refresh',
    async ({
      cookie: { refresh_token },
      jwt,
      refreshJwt,
      userService,
      set,
    }) => {
      const token = refresh_token.value as string;
      if (!token) {
        set.status = 401;
        throw new Error('Refresh token not found');
      }

      // 리프레시 토큰 검증
      const payload = await refreshJwt.verify(token);
      if (!payload || typeof payload !== 'object') {
        set.status = 401;
        throw new Error('Invalid refresh token signature');
      }

      const refreshPayload = payload as JWTRefreshPayload;
      if (!refreshPayload.sub) {
        set.status = 401;
        throw new Error('Invalid refresh token payload');
      }

      const userSeq = Number(refreshPayload.sub);
      const isValid = await userService.verifyRefreshToken(userSeq, token);

      if (!isValid) {
        set.status = 401;
        throw new Error('Refresh token mismatch or expired');
      }

      const user = await userService.findById(userSeq);
      if (!user) throw new Error('User not found');

      // 새로운 액세스 토큰 생성
      const newAccessToken = await jwt.sign({
        sub: String(user.userSeq),
        email: user.userEmail,
        name: user.userName,
      });

      return {
        accessToken: newAccessToken,
      };
    },
    {
      detail: {
        tags: ['User'],
        summary: '토큰 갱신',
      },
    },
  )

  // 프로필 이미지 업로드
  .post(
    '/upload-profile-image',
    async ({ user, body, userService, request }) => {
      if (!user) throw new Error('Unauthorized');
      const clientIp = getClientIp(request);
      const { file } = body as ProfileImageUploadDto;
      const updatedUser = await userService.updateProfile(
        Number(user.id),
        {},
        clientIp,
        file,
      );
      return updatedUser;
    },
    {
      body: ProfileImageUploadSchema,
      detail: {
        tags: ['User'],
        summary: '프로필 이미지 업로드',
        security: [{ BearerAuth: [] }],
      },
    },
  );
