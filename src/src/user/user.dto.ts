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
  userName?: string; //사용자명

  userEmail?: string; //사용자이메일

  userDescription?: string; //사용자설명
}
