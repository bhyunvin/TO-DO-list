import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';

/**
 * JWT 플러그인
 * JWT 토큰 생성 및 검증 기능을 제공합니다.
 */
export const jwtPlugin = new Elysia({ name: 'jwt' })
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'fallback-secret-key',
      exp: '7d', // 액세스 토큰 유효기간: 7일
    }),
  )
  .use(
    jwt({
      name: 'refreshJwt',
      secret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-key',
      exp: '30d', // 리프레시 토큰 유효기간: 30일
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

      if (!payload) {
        return { user: null };
      }

      // JWT 페이로드에서 사용자 정보 추출
      return {
        user: {
          id: payload.sub,
          username: payload.name,
          email: payload.email,
        },
      };
    } catch {
      // 토큰 검증 실패
      return { user: null };
    }
  });
