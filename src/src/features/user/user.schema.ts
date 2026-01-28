import { t, Static } from 'elysia';

/**
 * 로그인 스키마
 */
export const LoginSchema = t.Object({
  userId: t.String({ description: '아이디' }),
  userPw: t.String({ minLength: 1, description: '비밀번호' }),
});
export type LoginDto = Static<typeof LoginSchema>;

/**
 * 회원가입 스키마
 */
export const RegisterSchema = t.Object({
  userId: t.String({
    minLength: 1,
    maxLength: 40,
    description: '사용자 아이디',
  }),
  userEmail: t.String({ format: 'email', description: '이메일' }),
  userPw: t.String({ minLength: 8, description: '비밀번호' }),
  userName: t.String({ minLength: 1, maxLength: 40, description: '사용자명' }),
  userDescription: t.Optional(t.String({ description: '사용자 설명' })),
  privacyAgreed: t.Optional(
    t.Boolean({ description: '개인정보 수집 이용 동의' }),
  ),
});
export type RegisterDto = Static<typeof RegisterSchema>;

/**
 * 사용자 정보 업데이트 스키마
 */
export const UpdateUserSchema = t.Object({
  userEmail: t.Optional(
    t.String({
      format: 'email',
      maxLength: 100,
      description: '이메일',
    }),
  ),
  userName: t.Optional(
    t.String({
      minLength: 1,
      maxLength: 40,
      description: '사용자명',
    }),
  ),
  userDescription: t.Optional(
    t.Nullable(
      t.String({
        maxLength: 4000,
        description: '사용자 설명',
      }),
    ),
  ),
  aiApiKey: t.Optional(
    t.Nullable(
      t.String({
        description: 'AI API Key (빈 문자열이면 삭제)',
      }),
    ),
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
  userSeq: t.Number({ description: '사용자 번호' }),
  userId: t.String({ description: '사용자 아이디' }),
  userEmail: t.String({ description: '이메일' }),
  userName: t.String({ description: '사용자명' }),
  userDescription: t.Nullable(t.String({ description: '사용자 설명' })),
  profileImage: t.Nullable(t.String({ description: '프로필 이미지 경로' })),
  fileGroupNo: t.Nullable(t.Number({ description: '파일 그룹 번호' })),
  createdAt: t.Optional(t.Date({ description: '생성일' })),
  updatedAt: t.Optional(t.Date({ description: '수정일' })),
  hasAiApiKey: t.Boolean({ description: 'AI API Key 설정 여부' }),
});
export type UserResponseDto = Static<typeof UserResponseSchema>;

/**
 * 로그인 응답 스키마
 */
export const LoginResponseSchema = t.Object({
  accessToken: t.String({ description: '액세스 토큰' }),
  user: UserResponseSchema,
});
export type LoginResponseDto = Static<typeof LoginResponseSchema>;

/**
 * 중복 체크 응답 스키마
 */
export const DuplicateCheckResponseSchema = t.Object({
  isDuplicated: t.Boolean({ description: '중복 여부' }),
});
export type DuplicateCheckResponseDto = Static<
  typeof DuplicateCheckResponseSchema
>;
