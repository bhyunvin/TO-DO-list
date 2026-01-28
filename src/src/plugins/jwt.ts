import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';

/**
 * JWT 사용자 타입 정의
 */
export interface JWTUser {
  id: string | number;
  username: string;
  email: string;
}

/**
 * JWT 페이로드 타입 (Access Token)
 */
export interface JWTAccessPayload {
  sub: string;
  name: string;
  email?: string;
  [key: string]: string | number | boolean | undefined;
}

/**
 * JWT 페이로드 타입 (Refresh Token)
 */
export interface JWTRefreshPayload {
  sub: string;
  [key: string]: string | number | boolean | undefined;
}

export const jwtPlugin = (app: Elysia) =>
  app
    .use(
      jwt({
        name: 'jwt',
        secret: process.env.JWT_SECRET || 'fallback-secret-key',
        exp: '7d', // 액세스 토큰 유효기간: 7일
        schema: t.Object({
          sub: t.String(),
          name: t.String(),
          email: t.Optional(t.String()),
        }),
      }),
    )
    .use(
      jwt({
        name: 'refreshJwt',
        secret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-key',
        exp: '30d', // 리프레시 토큰 유효기간: 30일
        schema: t.Object({
          sub: t.String(),
        }),
      }),
    )
    .derive(async ({ jwt, headers }) => {
      const auth = headers.authorization;

      // Authorization 헤더가 없거나 Bearer 토큰이 아닌 경우
      if (!auth?.startsWith('Bearer ')) {
        return { user: null };
      }

      const token = auth.slice(7);

      try {
        const payload = await jwt.verify(token);

        if (!payload || typeof payload !== 'object') {
          return { user: null };
        }

        // JWT 페이로드 타입 검증
        const jwtPayload = payload as JWTAccessPayload;

        if (!jwtPayload.sub || !jwtPayload.name || !jwtPayload.email) {
          return { user: null };
        }

        // JWT 페이로드에서 사용자 정보 추출
        return {
          user: {
            id: jwtPayload.sub,
            username: jwtPayload.name,
            email: jwtPayload.email,
          } as JWTUser,
        };
      } catch {
        // 토큰 검증 실패
        return { user: null };
      }
    });
