import { t, Static } from 'elysia';

/**
 * 로그인 스키마
 */
export const LoginSchema = t.Object({
  userEmail: t.String({ format: 'email', description: '이메일' }),
  userPw: t.String({ minLength: 1, description: '비밀번호' }),
});
export type LoginDto = Static<typeof LoginSchema>;

/**
 * 회원가입 스키마
 */
export const RegisterSchema = t.Object({
  userEmail: t.String({ format: 'email', description: '이메일' }),
  userPw: t.String({ minLength: 8, description: '비밀번호' }),
  userName: t.String({ minLength: 1, description: '사용자명' }),
  userPhone: t.Optional(t.String({ description: '전화번호' })),
  // userDescription: t.Optional(t.String({ description: '사용자 설명' })), // 필요시 추가
  // aiApiKey: t.Optional(t.String({ description: 'AI API Key' })), // 필요시 추가
  // privacyAgreed: t.Optional(t.Boolean({ description: '개인정보 수집 이용 동의' })), // 필요시 추가
});
export type RegisterDto = Static<typeof RegisterSchema>;

/**
 * 사용자 정보 업데이트 스키마
 */
export const UpdateUserSchema = t.Object({
  userName: t.Optional(
    t.String({
      minLength: 1,
      maxLength: 200,
      description: '사용자명',
    }),
  ),
  userPhone: t.Optional(
    t.String({
      description: '전화번호',
    }),
  ),
  userDescription: t.Optional(
    t.String({
      maxLength: 4000,
      description: '사용자 설명',
    }),
  ),
});
export type UpdateUserDto = Static<typeof UpdateUserSchema>;

/**
 * 비밀번호 변경 스키마
 */
export const ChangePasswordSchema = t.Object({
  currentPassword: t.String({ minLength: 1, description: '현재 비밀번호' }),
  newPassword: t.String({
    minLength: 8,
    maxLength: 100,
    description: '새 비밀번호',
  }),
  confirmPassword: t.String({ minLength: 1, description: '새 비밀번호 확인' }),
});
export type ChangePasswordDto = Static<typeof ChangePasswordSchema>;

/**
 * 리프레시 토큰 스키마
 */
export const RefreshTokenSchema = t.Object({
  refreshToken: t.String({ minLength: 1, description: 'Refresh Token' }),
});
export type RefreshTokenDto = Static<typeof RefreshTokenSchema>;

/**
 * 프로필 이미지 업로드 스키마
 */
export const ProfileImageUploadSchema = t.Object({
  file: t.File({
    type: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: 5 * 1024 * 1024, // 5MB
    description: '프로필 이미지 파일',
  }),
});
export type ProfileImageUploadDto = Static<typeof ProfileImageUploadSchema>;

/**
 * 사용자 응답 스키마 (API 응답용)
 */
export const UserResponseSchema = t.Object({
  userNo: t.Number({ description: '사용자 번호' }),
  userEmail: t.String({ description: '이메일' }),
  userName: t.String({ description: '사용자명' }),
  userPhone: t.Optional(t.String({ description: '전화번호' })),
  fileGroupNo: t.Optional(t.Number({ description: '파일 그룹 번호' })),
  createdAt: t.Optional(t.Date({ description: '생성일' })),
  updatedAt: t.Optional(t.Date({ description: '수정일' })),
});
export type UserResponseDto = Static<typeof UserResponseSchema>;
