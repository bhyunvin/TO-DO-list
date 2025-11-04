import { 
  IsOptional, 
  IsString, 
  IsEmail, 
  MaxLength, 
  MinLength,
  Matches,
  IsNotEmpty
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

  adminYn: string; //관리자여부
}

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: '사용자명은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '사용자명은 비어있을 수 없습니다.' })
  @MinLength(1, { message: '사용자명은 최소 1자 이상이어야 합니다.' })
  @MaxLength(200, { message: '사용자명은 최대 200자까지 입력 가능합니다.' })
  @Matches(/^[a-zA-Z0-9\s\-'.가-힣]+$/, { 
    message: '사용자명에는 문자, 숫자, 공백, 하이픈, 아포스트로피, 마침표만 사용할 수 있습니다.' 
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  userName?: string; //사용자명

  @IsOptional()
  @IsString({ message: '이메일은 문자열이어야 합니다.' })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  @MaxLength(100, { message: '이메일은 최대 100자까지 입력 가능합니다.' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  userEmail?: string; //사용자이메일

  @IsOptional()
  @IsString({ message: '사용자설명은 문자열이어야 합니다.' })
  @MaxLength(4000, { message: '사용자설명은 최대 4000자까지 입력 가능합니다.' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  userDescription?: string; //사용자설명
}
