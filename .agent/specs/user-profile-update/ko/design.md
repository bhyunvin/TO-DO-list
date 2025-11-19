# 설계 문서

## 개요

사용자 프로필 업데이트 기능은 인증된 사용자가 이름, 이메일, 설명 및 프로필 이미지를 포함한 개인 정보를 수정할 수 있도록 합니다. 설계는 애플리케이션에 구축된 기존 사용자 인증 시스템, 파일 업로드 인프라 및 유효성 검사 패턴을 활용합니다.

이 기능은 헤더 영역에 "프로필 수정" 버튼을 추가하여 현재 TodoList 인터페이스와 원활하게 통합됩니다. 업데이트 폼은 기존 SignupForm 컴포넌트의 설계 패턴과 유효성 검사 로직을 재사용하면서 프로필 수정 시나리오에 맞게 조정합니다.

## 아키텍처

### 컴포넌트 아키텍처

```
TodoContainer (수정됨)
├── 사용자 정보 헤더 (수정됨)
│   ├── 환영 메시지
│   ├── 프로필 수정 버튼 (신규)
│   └── 로그아웃 버튼
├── ProfileUpdateForm (신규)
│   ├── 폼 필드
│   ├── 프로필 이미지 업로드
│   ├── 파일 업로드 진행률
│   └── 폼 액션
└── 기존 Todo 컴포넌트
```

### 백엔드 아키텍처

```
UserController (확장됨)
├── 기존 엔드포인트
└── PATCH /user/profile (신규)

UserService (확장됨)
├── 기존 메서드
└── updateProfile() (신규)

UserDto (확장됨)
├── 기존 필드
└── UpdateUserDto (신규)
```

## 컴포넌트 및 인터페이스

### 프론트엔드 컴포넌트

#### 1. ProfileUpdateForm 컴포넌트
**위치**: `client/src/components/ProfileUpdateForm.js`

**Props 인터페이스**:
```javascript
{
  user: UserEntity,           // 현재 사용자 데이터
  onSave: Function,          // 프로필 저장 핸들러
  onCancel: Function,        // 취소 핸들러
  isSubmitting: boolean      // 로딩 상태
}
```

**상태 관리**:
- 폼 필드 상태 (userName, userEmail, userDescription)
- 프로필 이미지 업로드 상태
- 유효성 검사 오류 상태
- 파일 업로드 진행률 추적

**주요 기능**:
- 현재 사용자 데이터로 미리 채워진 폼 필드
- 미리보기가 있는 프로필 이미지 업로드
- 실시간 유효성 검사 피드백
- 파일 업로드 진행률 표시
- 로딩 상태가 있는 폼 제출

#### 2. TodoContainer 수정사항
**위치**: `client/src/todoList/TodoList.js`

**새로운 상태**:
```javascript
const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
```

**새로운 핸들러**:
```javascript
const handleUpdateProfile = async (profileData) => {
  // API 호출이 있는 프로필 업데이트 로직
};
```

### 백엔드 컴포넌트

#### 1. UpdateUserDto
**위치**: `src/src/user/user.dto.ts`

```typescript
export class UpdateUserDto {
  userName?: string;
  userEmail?: string;
  userDescription?: string;
  // userPassword는 보안상 제외
  // userId는 변경 불가능하므로 제외
}
```

#### 2. UserController 확장
**위치**: `src/src/user/user.controller.ts`

**새로운 엔드포인트**:
```typescript
@UseGuards(AuthenticatedGuard)
@Patch('profile')
@UseInterceptors(
  FileInterceptor('profileImage', profileImageMulterOptions),
  ProfileImageValidationInterceptor,
)
async updateProfile(
  @Session() session: SessionInterface & SessionData,
  @Body() updateUserDto: UpdateUserDto,
  @UploadedFile() profileImageFile: Express.Multer.File,
  @Ip() ip: string,
): Promise<Omit<UserEntity, 'userPassword'>>
```

#### 3. UserService 확장
**위치**: `src/src/user/user.service.ts`

**새로운 메서드**:
```typescript
async updateProfile(
  userSeq: number,
  updateUserDto: UpdateUserDto,
  profileImageFile: Express.Multer.File,
  ip: string,
): Promise<Omit<UserEntity, 'userPassword'>>
```

## 데이터 모델

### 요청/응답 모델

#### 프로필 업데이트 요청
```typescript
{
  userName: string,           // 업데이트된 사용자 이름
  userEmail: string,          // 업데이트된 이메일 주소
  userDescription: string,    // 업데이트된 설명
  profileImage?: File         // 선택적 새 프로필 이미지
}
```

#### 프로필 업데이트 응답
```typescript
{
  userSeq: number,
  userId: string,
  userName: string,
  userEmail: string,
  userDescription: string,
  userProfileImageFileGroupNo: number,
  adminYn: string
  // userPassword는 보안상 제외
}
```

### 유효성 검사 규칙

#### 필드 유효성 검사
- **userName**: 필수, 최대 200자
- **userEmail**: 필수, 유효한 이메일 형식, 최대 100자, 사용자 간 고유
- **userDescription**: 선택사항, 최대 4000자
- **profileImage**: 선택사항, 기존 프로필 이미지 업로드 정책 준수

#### 비즈니스 규칙
- 이메일 고유성 확인 (현재 사용자 제외)
- 기존 파일 업로드 정책을 사용한 프로필 이미지 유효성 검사
- 세션 기반 인증 필요
- 모든 업데이트에 대한 감사 추적 로깅

## 오류 처리

### 프론트엔드 오류 처리

#### 유효성 검사 오류
```javascript
// 필드 수준 유효성 검사 오류
{
  nameError: string,
  emailError: string,
  profileImageError: string
}

// 파일 업로드 오류
{
  uploadErrors: Array<{
    fileName: string,
    errorMessage: string,
    errorCode: string
  }>
}
```

#### 사용자 피드백
- 폼 입력 중 실시간 유효성 검사 피드백
- 파일 업로드 진행률 및 오류 표시
- SweetAlert2를 사용한 성공/실패 알림
- 폼 제출 중 로딩 상태

### 백엔드 오류 처리

#### HTTP 상태 코드
- **200**: 성공적인 프로필 업데이트
- **400**: 유효성 검사 오류 (중복 이메일, 잘못된 파일 등)
- **401**: 인증되지 않음 (세션 만료)
- **500**: 내부 서버 오류

#### 오류 응답 형식
```typescript
{
  message: string,
  error?: string,
  errorCode?: string,
  errors?: Array<{
    fileName: string,
    errorMessage: string,
    errorCode: string
  }>
}
```

## 테스트 전략

### 프론트엔드 테스트
- **컴포넌트 테스트**: 다양한 사용자 데이터 시나리오로 ProfileUpdateForm 컴포넌트
- **통합 테스트**: TodoContainer에서 프로필 업데이트 흐름
- **파일 업로드 테스트**: 유효성 검사 시나리오가 있는 프로필 이미지 업로드
- **오류 처리 테스트**: 네트워크 실패 및 유효성 검사 오류

### 백엔드 테스트
- **단위 테스트**: 다양한 입력 시나리오로 UserService.updateProfile 메서드
- **통합 테스트**: 인증이 있는 프로필 업데이트 엔드포인트
- **파일 업로드 테스트**: 프로필 이미지 유효성 검사 및 저장
- **데이터베이스 테스트**: 사용자 데이터 업데이트 및 이메일 고유성 제약

### 테스트 시나리오

#### 정상 경로
1. 사용자가 이름과 이메일을 성공적으로 업데이트
2. 사용자가 새 프로필 이미지를 성공적으로 업로드
3. 사용자가 설명만 업데이트
4. 사용자가 변경 없이 프로필 업데이트 취소

#### 오류 시나리오
1. 중복 이메일 주소 유효성 검사
2. 잘못된 프로필 이미지 파일 업로드
3. 폼 제출 중 네트워크 실패
4. 업데이트 중 세션 만료
5. 파일 업로드 크기/유형 위반

## 보안 고려사항

### 인증 및 권한 부여
- 모든 프로필 작업에 세션 기반 인증 필요
- 사용자는 자신의 프로필 데이터만 업데이트 가능
- 비밀번호 업데이트는 이 기능에서 제외 (별도의 보안 흐름)

### 입력 유효성 검사
- 모든 사용자 입력에 대한 서버 측 유효성 검사
- 기존 보안 정책을 사용한 파일 업로드 유효성 검사
- TypeORM 파라미터화된 쿼리를 통한 SQL 주입 방지
- 입력 새니타이제이션을 통한 XSS 방지

### 데이터 보호
- 업데이트 작업에서 비밀번호 필드 제외
- 감사 추적에 민감한 사용자 데이터 적절히 로깅
- 기존 파일 관리 시스템을 사용하여 프로필 이미지 파일을 안전하게 저장

## 성능 고려사항

### 프론트엔드 최적화
- 서버 호출을 줄이기 위한 폼 유효성 검사 디바운싱
- 서버 왕복 없이 이미지 미리보기 생성
- 취소 지원이 있는 점진적 파일 업로드
- 적절한 상태 관리를 통한 효율적인 재렌더링

### 백엔드 최적화
- 프로필 업데이트를 위한 데이터베이스 트랜잭션 관리
- 기존 인프라를 사용한 효율적인 파일 업로드 처리
- 고유성 확인을 위한 이메일 필드의 적절한 인덱싱
- 감사 로깅 최적화

## 통합 지점

### 기존 시스템 통합
- **파일 업로드 시스템**: 기존 프로필 이미지 업로드 정책 및 유효성 검사 재사용
- **인증 시스템**: 현재 세션 관리와 통합
- **감사 시스템**: 기존 감사 열 인프라 활용
- **유효성 검사 시스템**: 구축된 파일 유효성 검사 서비스 사용

### UI/UX 통합
- **설계 일관성**: 기존 폼 스타일링 및 레이아웃 패턴 준수
- **탐색 흐름**: TodoList 인터페이스와 원활한 통합
- **오류 처리**: 기존 오류 표시 패턴과 일관성
- **로딩 상태**: 기존 로딩 표시기 스타일과 일치
