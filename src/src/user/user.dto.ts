import {
  IsOptional,
  IsString,
  IsEmail,
  MaxLength,
  MinLength,
  Matches,
  IsNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UserDto {
  userSeq: number; // 사용자번호

  userId: string; //사용자ID

  userName: string; //사용자명

  userPassword: string; //사용자비밀번호

  userEmail: string; //사용자이메일

  userDescription: string; //사용자설명

  userProfileImageFileGroupNo: number; //사용자프로필이미지파일그룹번호

  aiApiKey?: string; // AI API Key

  adminYn: string; //관리자여부

  @IsOptional()
  profileImage?: string; // 프로필 이미지 URL (응답용)
}

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: '사용자명은 문자열이어야 합니다.' })
  @MinLength(1, { message: '사용자명은 최소 1자 이상이어야 합니다.' })
  @MaxLength(200, { message: '사용자명은 최대 200자까지 입력 가능합니다.' })
  @Matches(/^[a-zA-Z0-9\s\-'.가-힣]+$/, {
    message:
      '사용자명에는 문자, 숫자, 공백, 하이픈, 아포스트로피, 마침표만 사용할 수 있습니다.',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      // 빈 문자열이면 undefined로 변환하여 필드를 제외
      return trimmed === '' ? undefined : trimmed;
    }
    return value;
  })
  userName?: string; //사용자명

  @IsOptional()
  @IsString({ message: '이메일은 문자열이어야 합니다.' })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  @MaxLength(100, { message: '이메일은 최대 100자까지 입력 가능합니다.' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim().toLowerCase();
      // 빈 문자열이면 undefined로 변환하여 필드를 제외
      return trimmed === '' ? undefined : trimmed;
    }
    return value;
  })
  userEmail?: string; //사용자이메일

  @IsOptional()
  @IsString({ message: '사용자설명은 문자열이어야 합니다.' })
  @MaxLength(4000, { message: '사용자설명은 최대 4000자까지 입력 가능합니다.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  userDescription?: string; //사용자설명

  @IsOptional()
  @IsString({ message: 'API Key는 문자열이어야 합니다.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  aiApiKey?: string; // AI API Key
}

export class ChangePasswordDto {
  @IsNotEmpty({ message: '현재 비밀번호를 입력해주세요.' })
  @IsString({ message: '현재 비밀번호는 문자열이어야 합니다.' })
  currentPassword: string; //현재 비밀번호

  @IsNotEmpty({ message: '새 비밀번호를 입력해주세요.' })
  @IsString({ message: '새 비밀번호는 문자열이어야 합니다.' })
  @MinLength(8, { message: '새 비밀번호는 최소 8자 이상이어야 합니다.' })
  @MaxLength(100, { message: '새 비밀번호는 최대 100자까지 입력 가능합니다.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      '새 비밀번호는 대문자, 소문자, 숫자, 특수문자를 각각 하나 이상 포함해야 합니다.',
  })
  newPassword: string; //새 비밀번호

  @IsNotEmpty({ message: '새 비밀번호 확인을 입력해주세요.' })
  @IsString({ message: '새 비밀번호 확인은 문자열이어야 합니다.' })
  confirmPassword: string; //새 비밀번호 확인
}
