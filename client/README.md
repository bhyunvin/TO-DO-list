# 프론트엔드 (React)

TO-DO List 애플리케이션의 프론트엔드 클라이언트입니다. React 19와 React Bootstrap을 사용하여 구축되었으며, Zustand를 통한 상태 관리를 제공합니다.

## 주요 기능

- 전역 상태 관리 (Zustand + Persist Middleware)
- 사용자 인증 (JWT 기반 로그인/회원가입)
  - 개인정보 수집 이용 동의 필수
- 날짜별 Todo 관리 인터페이스
- AI 챗 어시스턴트
- 파일 업로드 (Cloudinary 클라우드 스토리지)
  - 진행률 표시
  - 클라이언트 사이드 파일 검증
- 프로필 관리 및 이미지 업로드
- 비밀번호 변경
- Contact Developer (관리자 문의 메일 전송)
- **디자인 원칙**:
  - 모던하고 깨끗한 UI/UX 제공 (Glassmorphism, 고대비 모드 등)
  - 모든 버튼은 **Outline 스타일**(`btn-outline-*`)을 기본으로 사용하여 일관된 디자인 언어 유지
  - **버튼 순서**: '기타 행동/취소' -> '이동/확인' 순서(좌측부터)를 준수하며, 버튼 간 적절한 간격(margin) 유지
  - 사용자 경험을 위한 세심한 인터랙션 및 애니메이션 (SweetAlert2 활용 등)
- 반응형 디자인 (Bootstrap 5)
- 실시간 알림 (SweetAlert2)
- 웹 접근성 준수 (WCAG 2.1 AA, 고대비 모드)

## 기술 스택

- **프레임워크**: React 19.1.1
- **빌드 도구**: Vite
- **UI 라이브러리**: React Bootstrap 2.10+ with Bootstrap 5.3+
- **상태 관리**: Zustand 5.0.8
- **HTTP 클라이언트**: Elysia Treaty (End-to-End Type Safety)
- **알림**: SweetAlert2 11.22.5
- **날짜 처리**: date-fns 4.1.0, react-datepicker 8.7.0
- **보안**: DOMPurify 3.3.0
- **타입 검사**: PropTypes 15.x
- **아이콘**: Bootstrap Icons 1.13.1
- **테스트**: Jest, React Testing Library

## 프로젝트 구조

```
client/
├── public/                      # 정적 파일
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── index.tsx               # 애플리케이션 진입점
│   ├── App.tsx                 # 메인 애플리케이션 컴포넌트
│   ├── App.css                 # 전역 스타일
│   ├── loginForm/              # 로그인/회원가입
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   └── loginForm.css
│   ├── todoList/               # Todo 관리
│   │   ├── TodoList.tsx
│   │   └── todoList.css
│   ├── components/             # 재사용 가능한 컴포넌트
│   │   ├── ChatComponent.tsx
│   │   ├── FileUploadComponent.tsx
│   │   ├── ProfileComponent.tsx
│   │   ├── FloatingActionButton.tsx
│   │   └── *.css
│   ├── authStore/              # Zustand 인증 상태 (JWT 관리)
│   │   └── authStore.ts
│   ├── stores/                 # 추가 Zustand 스토어
│   │   └── chatStore.ts
│   ├── hooks/                  # 커스텀 React 훅
│   │   ├── useScrollLock.ts
│   │   ├── useFileUpload.ts
│   │   └── useSecureImage.ts   # JWT 기반 보안 이미지 로더
│   └── vite.config.ts          # Vite 설정
└── package.json
```

## 사전 요구사항

- Bun 1.0.0 이상

## 설치 방법

```bash
# 의존성 설치
bun install
```

## 환경 변수 설정

`.env` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# API 프록시 설정 (개발 환경)
VITE_API_URL=...

# 기타 설정
REACT_APP_MAX_FILE_SIZE=...
```

**보안 참고**: 프로덕션 환경에서는 적절한 API URL과 설정값을 사용하세요.

## 실행 방법

```bash
# 개발 서버 시작 (포트 5173)
bun run dev

# 프로덕션 빌드
bun run build

# 빌드된 애플리케이션 미리보기
bun run preview
```

개발 서버가 시작되면 브라우저에서 애플리케이션을 확인할 수 있습니다.

## 테스트

```bash
# 테스트 실행 (watch 모드)
bun test

# 테스트 커버리지
bun test -- --coverage

# 특정 테스트 파일 실행
bun test -- LoginForm.test.tsx
```

## 코드 품질

```bash
# Lint 검사
bun run lint

# Lint 자동 수정 (package.json에 스크립트 추가 필요)
bun run lint -- --fix
```

## 주요 컴포넌트

### App.tsx

- 메인 애플리케이션 컴포넌트
- 인증 상태에 따른 라우팅
- 로그인/회원가입 폼 또는 Todo 리스트 표시

### LoginForm / SignupForm

- 사용자 인증 폼
- 입력 유효성 검사
- 에러 처리 및 알림

### TodoList

- 날짜별 Todo 관리
- Todo 생성, 수정, 삭제
- 날짜 선택기 통합

### ChatComponent

- AI 채팅 인터페이스
- 마크다운 렌더링
- 실시간 메시지 스트리밍

### FileUploadComponent

- 파일 업로드 인터페이스
- 진행률 표시
- 드래그 앤 드롭 지원

### ProfileComponent

- 사용자 프로필 관리
- 프로필 이미지 업로드
- 비밀번호 변경

### FloatingActionButton

- 플로팅 액션 버튼
- 채팅 및 프로필 모달 토글

## 상태 관리

### authStore (Zustand)

- 사용자 인증 상태 및 JWT 토큰 관리
- 로그인/로그아웃 액션 (토큰 저장/삭제)
- Persist 미들웨어를 통한 상태 유지

### chatStore (Zustand)

- 채팅 메시지 상태
- 메시지 추가/삭제
- 채팅 히스토리 관리

## API 통신

### Elysia Treaty

**Elysia Treaty**를 사용하여 백엔드와 완벽한 타입 안전성을 보장하는 API 통신을 수행합니다.

**보안 참고**: 프로덕션 환경에서는 적절한 CORS 설정과 API 엔드포인트를 구성하세요.

## 스타일링

- **Bootstrap 5.3+**: 기본 UI 프레임워크
- **React Bootstrap**: React 컴포넌트 래퍼
- **Bootstrap Icons**: 아이콘 라이브러리
- **커스텀 CSS**: 컴포넌트별 스타일 파일

## 보안

- HTML 새니타이제이션을 통한 XSS 방지
- 입력 유효성 검사
- **JWT 인증**: Stateless 인증 방식 사용 (클라이언트 스토리지에 토큰 저장)
- **보안 이미지 로딩**: `useSecureImage` 훅을 통해 Protected 경로 이미지도 토큰 인증 후 Blob으로 로드

**중요**: 프로덕션 환경에서는 HTTPS를 사용하고, 적절한 보안 헤더를 설정하세요.

## 명명 규칙

- **컴포넌트**: PascalCase
- **파일**: PascalCase (컴포넌트), camelCase (유틸리티)
- **CSS 클래스**: camelCase
- **함수**: camelCase
- **상수**: UPPER_SNAKE_CASE

## 코드 주석 작성 가이드라인

- **모든 코드 주석은 한글로 작성**해야 하며, 문법상 필요한 요소는 예외입니다
- 변수명, 함수명, 기술 용어는 영문으로 유지합니다
- 주석의 설명 내용만 한글로 작성합니다

## 빌드 및 배포

### 프로덕션 빌드

```bash
# 빌드 생성
bun run build
```

빌드된 파일은 `dist/` 디렉토리에 생성됩니다.

### 배포

빌드된 파일을 정적 파일 서버에 배포:

- Nginx
- Apache
- AWS S3 + CloudFront
- Vercel
- Netlify

## 문제 해결

### 프록시 오류

- 백엔드 서버가 실행 중인지 확인 (포트 3001)
- `vite.config.ts` 설정 확인

### 빌드 오류

- Node 버전 확인 (Bun 사용)
- `node_modules` 삭제 후 재설치
- 캐시 정리: `bun pm cache rm`

### 스타일 오류

- Bootstrap CSS가 올바르게 임포트되었는지 확인
- 브라우저 캐시 정리

## 라이선스

UNLICENSED - 비공개 프로젝트

---

# Frontend (React)

Frontend client for the TO-DO List application. Built with React 19 and React Bootstrap, providing state management via Zustand.

## Key Features

- Global State Management (Zustand + Persist Middleware)
- User Authentication (JWT-based Login/Signup)
  - Privacy policy consent required
- Date-based Todo management interface
- AI chat assistant
- File upload (Cloudinary cloud storage)
  - Progress tracking
  - Client-side file validation
- Profile management and image upload
- Password change
- Contact Developer (send inquiry email to administrator)
- **Design Principles**:
  - Modern and clean UI/UX (Glassmorphism, high contrast mode)
  - All buttons use **Outline style** (`btn-outline-*`) for consistent design language
  - **Button order**: 'Other actions/Cancel' -> 'Navigate/Confirm' (left to right) with proper spacing
  - Thoughtful interactions and animations for user experience (SweetAlert2)
- Responsive design (Bootstrap 5)
- Real-time notifications (SweetAlert2)
- Web Accessibility compliant (WCAG 2.1 AA, High contrast mode)

## Technology Stack

- **Framework**: React 19.1.1
- **Build Tool**: Vite
- **UI Library**: React Bootstrap 2.10+ with Bootstrap 5.3+
- **State Management**: Zustand 5.0.8
- **HTTP Client**: Elysia Treaty (End-to-End Type Safety)
- **Notifications**: SweetAlert2 11.22.5
- **Date Handling**: date-fns 4.1.0, react-datepicker 8.7.0
- **Security**: DOMPurify 3.3.0
- **Type Checking**: PropTypes 15.x
- **Icons**: Bootstrap Icons 1.13.1
- **Testing**: Jest, React Testing Library

## Project Structure

```
client/
├── public/                      # Static files
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── index.tsx               # Application entry point
│   ├── App.tsx                 # Main application component
│   ├── App.css                 # Global styles
│   ├── loginForm/              # Login/signup
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   └── loginForm.css
│   ├── todoList/               # Todo management
│   │   ├── TodoList.tsx
│   │   └── todoList.css
│   ├── components/             # Reusable components
│   │   ├── ChatComponent.tsx
│   │   ├── FileUploadComponent.tsx
│   │   ├── ProfileComponent.tsx
│   │   ├── FloatingActionButton.tsx
│   │   └── *.css
│   ├── authStore/              # Zustand auth state (JWT management)
│   │   └── authStore.ts
│   ├── stores/                 # Additional Zustand stores
│   │   └── chatStore.ts
│   ├── hooks/                  # Custom React hooks
│   │   ├── useScrollLock.ts
│   │   ├── useFileUpload.ts
│   │   └── useSecureImage.ts   # JWT-based secure image loader
│   └── vite.config.ts          # Vite configuration
└── package.json
```

## Prerequisites

- Bun 1.0.0 or higher

## Installation

```bash
# Install dependencies
bun install
```

## Environment Configuration

Create a `.env` file and configure the following variables:

```env
# API proxy configuration (development)
VITE_API_URL=...

# Other settings
REACT_APP_MAX_FILE_SIZE=...
```

**Security Note**: Use appropriate API URL and configuration values in production.

## Running the Application

```bash
# Start development server (port 5173)
bun run dev

# Production build
bun run build

# Test built application
bun run preview
```

Once the development server starts, you can view the application in your browser.

## Testing

```bash
# Run tests (watch mode)
bun test

# Test coverage
bun test -- --coverage

# Run specific test file
bun test -- LoginForm.test.tsx
```

## Code Quality

```bash
# Lint check
bun run lint

# Lint auto-fix (requires script in package.json)
bun run lint -- --fix
```

## Main Components

### App.tsx

- Main application component
- Routing based on authentication state
- Displays login/signup forms or Todo list

### LoginForm / SignupForm

- User authentication forms
- Input validation
- Error handling and notifications

### TodoList

- Date-based Todo management
- Todo creation, editing, deletion
- Date picker integration

### ChatComponent

- AI chat interface
- Markdown rendering
- Real-time message streaming

### FileUploadComponent

- File upload interface
- Progress tracking
- Drag and drop support

### ProfileComponent

- User profile management
- Profile image upload
- Password change

### FloatingActionButton

- Floating action button
- Toggle chat and profile modals

## State Management

### authStore (Zustand)

- User authentication state & JWT token management
- Login/logout actions (Token persistence)
- State persistence via middleware

### chatStore (Zustand)

- Chat message state
- Message add/delete
- Chat history management

## API Communication

### Elysia Treaty

Uses **Elysia Treaty** for end-to-end type-safe API communication with the backend.

**Security Note**: Configure appropriate CORS settings and API endpoints in production.

## Styling

- **Bootstrap 5.3+**: Base UI framework
- **React Bootstrap**: React component wrappers
- **Bootstrap Icons**: Icon library
- **Custom CSS**: Component-specific style files

## Security

- XSS prevention via HTML sanitization
- Input validation
- **JWT Authentication**: Stateless authentication (Token storage in client state)
- **Secure Image Loading**: `useSecureImage` hook loads protected images as Blobs with auth headers

**Important**: Use HTTPS in production and configure appropriate security headers.

## Naming Conventions

- **Components**: PascalCase
- **Files**: PascalCase (components), camelCase (utilities)
- **CSS Classes**: camelCase
- **Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE

## Code Comments Guidelines

- **All code comments should be written in Korean**, except for syntax-required elements
- Variable names, function names, and technical terms remain in English
- Only the descriptive content of comments should be in Korean

## Build and Deployment

### Production Build

```bash
# Create build
bun run build
```

Built files are generated in the `dist/` directory.

### Deployment

Deploy built files to a static file server:

- Nginx
- Apache
- AWS S3 + CloudFront
- Vercel
- Netlify

## Troubleshooting

### Proxy Error

- Verify backend server is running (port 3001)
- Check `vite.config.ts` configuration

### Build Error

- Check Bun version
- Delete `node_modules` and reinstall
- Clear cache: `bun pm cache rm`

### Style Error

- Verify Bootstrap CSS is properly imported
- Clear browser cache

## License

UNLICENSED - Private project
