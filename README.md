# TO-DO List 애플리케이션

현대적인 웹 기술로 구축된 풀스택 TO-DO List 애플리케이션입니다. 사용자 인증, 날짜 기반 todo 관리, 파일 업로드, AI 채팅 어시스턴트 기능을 제공합니다.

## 주요 기능

- 세션 기반 사용자 인증 및 회원가입
- 날짜별 todo 생성, 조회, 수정, 삭제
- 파일 업로드 및 첨부 기능 (진행률 표시)
- Google Gemini API를 활용한 AI 채팅 어시스턴트
  - 멀티턴 대화 지원 (이전 대화 컨텍스트 유지)
  - Todo 읽기/생성/수정 가능
  - Function calling을 통한 실시간 Todo 조작
- 프로필 이미지 업로드 및 관리
- 비밀번호 변경 기능
- 마크다운 렌더링 (XSS 보호)
- 포괄적인 감사 로깅
- macOS Keychain을 통한 안전한 자격 증명 저장

## 기술 스택

### 백엔드 (NestJS)
- **프레임워크**: NestJS with Express
- **언어**: TypeScript
- **데이터베이스**: PostgreSQL with TypeORM
- **인증**: Express Session with bcrypt
- **보안**: Keychain integration, AES-256-GCM encryption
- **AI**: Google Gemini API via @nestjs/axios
- **파일 업로드**: Multer
- **마크다운**: marked, sanitize-html

### 프론트엔드 (React)
- **프레임워크**: React 19 with Create React App
- **UI 라이브러리**: React Bootstrap 2.10+ with Bootstrap 5.3+
- **상태 관리**: Zustand
- **HTTP 클라이언트**: Axios
- **알림**: SweetAlert2
- **날짜 처리**: date-fns, react-datepicker
- **보안**: DOMPurify

### 개발 도구
- **패키지 매니저**: npm with workspaces
- **코드 포맷팅**: Prettier
- **프로세스 관리**: Concurrently
- **Node 버전**: 24.0.0+ (.nvmrc로 관리)

## 프로젝트 구조

```
myTodoApp/
├── client/                      # React 프론트엔드 애플리케이션
│   ├── src/
│   │   ├── App.js              # 메인 애플리케이션 컴포넌트
│   │   ├── loginForm/          # 로그인/회원가입 폼
│   │   ├── todoList/           # Todo 관리 인터페이스
│   │   ├── components/         # 재사용 가능한 컴포넌트
│   │   │   ├── ChatComponent.js
│   │   │   ├── FileUploadComponent.js
│   │   │   ├── ProfileComponent.js
│   │   │   └── FloatingActionButton.js
│   │   ├── authStore/          # Zustand 인증 상태
│   │   ├── stores/             # 추가 Zustand 스토어
│   │   └── hooks/              # 커스텀 React 훅
│   └── package.json
│
├── src/                         # NestJS 백엔드 애플리케이션
│   ├── main.ts                 # 애플리케이션 부트스트랩
│   ├── app.module.ts           # 루트 모듈
│   ├── user/                   # 사용자 인증 및 관리
│   ├── todo/                   # Todo CRUD 및 날짜 기반 쿼리
│   ├── assistance/             # AI 지원 통합
│   ├── fileUpload/             # 파일 업로드 처리
│   ├── logging/                # 로깅 및 감사 추적
│   ├── utils/                  # 공유 유틸리티
│   ├── filter/                 # 전역 예외 필터
│   ├── interceptor/            # 전역 인터셉터
│   └── types/                  # TypeScript 타입 확장
│
├── upload/                      # 파일 업로드 저장소
├── .kiro/                       # Kiro 설정 및 스티어링 규칙
├── package.json                 # 워크스페이스 구성
├── .nvmrc                       # Node 버전 명세
└── README.md
```

## 사전 요구사항

- **Node.js**: 24.0.0 이상
- **npm**: 8 이상
- **PostgreSQL**: 최신 버전
- **nvm**: Node 버전 관리 (권장)

## 설치 방법

### 1. 저장소 클론 및 의존성 설치

```bash
# 저장소 클론
git clone <repository-url>
cd myTodoApp

# Node 버전 설정 (필수)
nvm use 24

# 모든 의존성 설치 (루트, 백엔드, 프론트엔드)
npm install
```

### 2. 환경 변수 설정

#### 백엔드 환경 변수 (`src/.env`)

```env
# 데이터베이스 설정
DB_HOST=...
DB_PORT=...
DB_USERNAME=...
DB_PASSWORD=...
DB_DATABASE=...

# 서버 포트
PORT=...

# 세션 설정 (강력한 랜덤 문자열 사용)
SESSION_SECRET=...

# Google Gemini API
GEMINI_API_KEY=...
```

**보안 참고**: 프로덕션 환경에서는 강력한 비밀번호와 시크릿 키를 사용하고, 환경 변수를 안전하게 관리하세요.

#### 프론트엔드 환경 변수 (`client/.env`)

```env
# API 프록시 설정 (개발 환경)
VITE_API_URL=...
```

### 3. 데이터베이스 설정

PostgreSQL 데이터베이스를 생성하고 TypeORM이 자동으로 테이블을 생성하도록 합니다.

데이터베이스 생성 후 `.env` 파일에 연결 정보를 설정하세요.

## 실행 방법

### 개발 환경

**중요**: 모든 명령어 실행 전에 `nvm use 24`를 실행하여 올바른 Node.js 버전을 사용하세요.

```bash
# Node 버전 설정 (필수)
nvm use 24

# 프론트엔드와 백엔드 동시 실행
npm start

# 또는 개별 실행
npm run start:server    # 백엔드만 실행 (포트 3001)
npm run start:client    # 프론트엔드만 실행 (포트 5173)
```

### 프로덕션 빌드

```bash
# Node 버전 설정 (필수)
nvm use 24

# 프론트엔드와 백엔드 모두 빌드
npm run build
```

### 백엔드 전용 명령어 (src/ 디렉토리)

```bash
cd src

# Node 버전 설정 (필수)
nvm use 24

# 개발 모드 (핫 리로드)
npm run start:dev

# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm run start:prod

# 테스트 실행
npm test

# Lint 및 수정
npm run lint
```

**보안 참고**: 프로덕션 배포 시 환경 변수, 방화벽 설정, HTTPS 인증서 등을 적절히 구성하세요.

### 프론트엔드 전용 명령어 (client/ 디렉토리)

```bash
cd client

# Node 버전 설정 (필수)
nvm use 24

# 개발 서버
npm start

# 프로덕션 빌드
npm run build

# 테스트 실행
npm test
```

## 명명 규칙

### 백엔드
- **엔티티**: `Entity` 접미사를 가진 PascalCase
- **컨트롤러**: `Controller` 접미사를 가진 PascalCase
- **서비스**: `Service` 접미사를 가진 PascalCase
- **DTO**: `Dto` 접미사를 가진 PascalCase
- **데이터베이스 테이블**: 프로젝트 접두사 + snake_case
- **데이터베이스 컬럼**: snake_case

### 프론트엔드
- **컴포넌트**: PascalCase
- **파일**: 컴포넌트는 PascalCase, 유틸리티는 camelCase
- **CSS 클래스**: camelCase

## 아키텍처 패턴

### 백엔드
- **모듈 기반 아키텍처**: 각 기능은 독립적인 NestJS 모듈
- **리포지토리 패턴**: TypeORM 엔티티와 서비스 레이어 추상화
- **가드 패턴**: 라우트 보호를 위한 인증 가드
- **인터셉터 패턴**: 횡단 관심사 (로깅, 에러 처리)
- **감사 패턴**: 모든 엔티티에 대한 표준화된 감사 컬럼

### 프론트엔드
- **컴포넌트 조합**: 작고 집중된 React 컴포넌트
- **전역 상태 관리**: Zustand를 사용한 인증 및 채팅 상태
- **프록시 패턴**: setupProxy.js를 통한 개발 API 프록시
- **조건부 렌더링**: 인증 기반 컴포넌트 전환

## 코드 주석 작성 가이드라인

- **모든 코드 주석은 한글로 작성**해야 하며, 문법상 필요한 요소(예: JSDoc 태그 `@param`, `@return`)는 예외입니다
- 변수명, 함수명, 기술 용어는 영문으로 유지합니다
- 주석의 설명 내용만 한글로 작성합니다

## 보안

- 강력한 암호화 알고리즘을 사용한 비밀번호 해싱
- 세션 기반 인증 시스템
- 안전한 자격 증명 저장 메커니즘
- XSS 및 CSRF 공격 방지
- 입력 유효성 검사 및 새니타이제이션
- CORS 설정을 통한 교차 출처 요청 제어

**중요**: 프로덕션 환경에서는 추가적인 보안 조치(HTTPS, 방화벽, 레이트 리미팅 등)를 반드시 적용하세요.

## 라이선스

UNLICENSED - 비공개 프로젝트

---

# TO-DO List Application

A full-stack TO-DO List application built with modern web technologies. Provides user authentication, date-based todo management, file upload capabilities, and AI chat assistant features.

## Key Features

- Session-based user authentication and registration
- Create, read, update, and delete todos by date
- File upload and attachment functionality (with progress tracking)
- AI chat assistant powered by Google Gemini API
  - Multi-turn conversation support (maintains previous conversation context)
  - Can read/create/update todos
  - Real-time todo manipulation via function calling
- Profile image upload and management
- Password change functionality
- Markdown rendering (with XSS protection)
- Comprehensive audit logging
- Secure credential storage via macOS Keychain

## Technology Stack

### Backend (NestJS)
- **Framework**: NestJS with Express
- **Language**: TypeScript
- **Database**: PostgreSQL with TypeORM
- **Authentication**: Express Session with bcrypt
- **Security**: Keychain integration, AES-256-GCM encryption
- **AI**: Google Gemini API via @nestjs/axios
- **File Upload**: Multer
- **Markdown**: marked, sanitize-html

### Frontend (React)
- **Framework**: React 19 with Create React App
- **UI Library**: React Bootstrap 2.10+ with Bootstrap 5.3+
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Notifications**: SweetAlert2
- **Date Handling**: date-fns, react-datepicker
- **Security**: DOMPurify

### Development Tools
- **Package Manager**: npm with workspaces
- **Code Formatting**: Prettier
- **Process Management**: Concurrently
- **Node Version**: 24.0.0+ (managed via .nvmrc)

## Project Structure

```
myTodoApp/
├── client/                      # React frontend application
│   ├── src/
│   │   ├── App.js              # Main application component
│   │   ├── loginForm/          # Login/signup forms
│   │   ├── todoList/           # Todo management interface
│   │   ├── components/         # Reusable components
│   │   │   ├── ChatComponent.js
│   │   │   ├── FileUploadComponent.js
│   │   │   ├── ProfileComponent.js
│   │   │   └── FloatingActionButton.js
│   │   ├── authStore/          # Zustand auth state
│   │   ├── stores/             # Additional Zustand stores
│   │   └── hooks/              # Custom React hooks
│   └── package.json
│
├── src/                         # NestJS backend application
│   ├── main.ts                 # Application bootstrap
│   ├── app.module.ts           # Root module
│   ├── user/                   # User authentication and management
│   ├── todo/                   # Todo CRUD and date-based queries
│   ├── assistance/             # AI assistance integration
│   ├── fileUpload/             # File upload handling
│   ├── logging/                # Logging and audit trails
│   ├── utils/                  # Shared utilities
│   ├── filter/                 # Global exception filters
│   ├── interceptor/            # Global interceptors
│   └── types/                  # TypeScript type extensions
│
├── upload/                      # File upload storage
├── .kiro/                       # Kiro settings and steering rules
├── package.json                 # Workspace configuration
├── .nvmrc                       # Node version specification
└── README.md
```

## Prerequisites

- **Node.js**: 24.0.0 or higher
- **npm**: 8 or higher
- **PostgreSQL**: Latest version
- **nvm**: Node version manager (recommended)

## Installation

### 1. Clone Repository and Install Dependencies

```bash
# Clone repository
git clone <repository-url>
cd myTodoApp

# Set Node version (required)
nvm use 24

# Install all dependencies (root, backend, frontend)
npm install
```

### 2. Environment Configuration

#### Backend Environment Variables (`src/.env`)

```env
# Database configuration
DB_HOST=...
DB_PORT=...
DB_USERNAME=...
DB_PASSWORD=...
DB_DATABASE=...

# Server port
PORT=...

# Session configuration (use strong random string)
SESSION_SECRET=...

# Google Gemini API
GEMINI_API_KEY=...
```

**Security Note**: Use strong passwords and secret keys in production, and manage environment variables securely.

#### Frontend Environment Variables (`client/.env`)

```env
# API proxy configuration (development)
VITE_API_URL=...
```

### 3. Database Setup

Create a PostgreSQL database and let TypeORM automatically create tables.

After creating the database, configure the connection information in the `.env` file.

## Running the Application

### Development Environment

**Important**: Always run `nvm use 24` before executing any commands to ensure the correct Node.js version.

```bash
# Set Node version (required)
nvm use 24

# Run both frontend and backend
npm start

# Or run individually
npm run start:server    # Backend only (port 3001)
npm run start:client    # Frontend only (port 5173)
```

### Production Build

```bash
# Set Node version (required)
nvm use 24

# Build both frontend and backend
npm run build
```

### Backend-Specific Commands (src/ directory)

```bash
cd src

# Set Node version (required)
nvm use 24

# Development mode (hot reload)
npm run start:dev

# Production build
npm run build

# Production run
npm run start:prod

# Run tests
npm test

# Lint and fix
npm run lint
```

**Security Note**: When deploying to production, properly configure environment variables, firewall settings, HTTPS certificates, etc.

### Frontend-Specific Commands (client/ directory)

```bash
cd client

# Set Node version (required)
nvm use 24

# Development server
npm start

# Production build
npm run build

# Run tests
npm test
```

## Naming Conventions

### Backend
- **Entities**: PascalCase with `Entity` suffix
- **Controllers**: PascalCase with `Controller` suffix
- **Services**: PascalCase with `Service` suffix
- **DTOs**: PascalCase with `Dto` suffix
- **Database Tables**: Project prefix + snake_case
- **Database Columns**: snake_case

### Frontend
- **Components**: PascalCase
- **Files**: PascalCase for components, camelCase for utilities
- **CSS Classes**: camelCase

## Architecture Patterns

### Backend
- **Module-based architecture**: Each feature is a self-contained NestJS module
- **Repository pattern**: TypeORM entities with service layer abstraction
- **Guard pattern**: Authentication guards for route protection
- **Interceptor pattern**: Cross-cutting concerns (logging, error handling)
- **Audit pattern**: Standardized audit columns for all entities

### Frontend
- **Component composition**: Small, focused React components
- **Global state management**: Zustand for authentication and chat state
- **Proxy pattern**: Development API proxy via setupProxy.js
- **Conditional rendering**: Auth-based component switching

## Code Comments Guidelines

- **All code comments should be written in Korean**, except for syntax-required elements (e.g., JSDoc tags like `@param`, `@return`)
- Variable names, function names, and technical terms remain in English
- Only the descriptive content of comments should be in Korean

## Security

- Strong encryption algorithm for password hashing
- Session-based authentication system
- Secure credential storage mechanism
- XSS and CSRF attack prevention
- Input validation and sanitization
- Cross-origin request control via CORS configuration

**Important**: In production environments, always apply additional security measures (HTTPS, firewall, rate limiting, etc.).

## License

UNLICENSED - Private project
