# TO-DO List 애플리케이션

현대적인 웹 기술로 구축된 풀스택 TO-DO List 애플리케이션입니다. 사용자 인증, 날짜 기반 todo 관리, 파일 업로드, AI 채팅 어시스턴트 기능을 제공합니다.

## 주요 기능

- JWT 기반 사용자 인증 및 회원가입 (개인정보 동의 포함)
- 날짜별 todo 생성, 조회, 수정, 삭제
- 파일 업로드 및 첨부 기능 (Cloudinary 클라우드 스토리지)
  - 진행률 표시
  - 서버 사이드 파일 검증 (크기, 형식, 보안)
  - 프로필 이미지 및 Todo 첨부파일 지원
- Google Gemini API를 활용한 AI 채팅 어시스턴트
  - 멀티턴 대화 지원 (이전 대화 컨텍스트 유지)
  - Todo 읽기/생성/수정 가능
  - Function calling을 통한 실시간 Todo 조작
- 프로필 이미지 업로드 및 관리
- 비밀번호 변경 기능
- Contact Developer (관리자 문의 메일 전송)
- 마크다운 렌더링 (XSS 보호)
- 포괄적인 감사 로깅 및 IP 익명화 스케줄러
- 환경 변수를 통한 안전한 자격 증명 저장
- 데이터 암호화 (AES-256-GCM)

## 기술 스택

### 백엔드 (ElysiaJS)
- **프레임워크**: ElysiaJS
- **런타임**: Bun (Node.js 호환)
- **언어**: TypeScript
- **데이터베이스**: PostgreSQL with TypeORM
- **인증**: JWT (stateless) with Bun.password (bcrypt algorithm)
- **보안**: AES-256-GCM encryption
- **AI**: Google Gemini API
- **API 통신**: Elysia Treaty (엔드투엔드 타입 안전성)
- **파일 스토리지**: Cloudinary
- **메일**: Nodemailer
- **마크다운**: marked, sanitize-html
- **스케줄러**: cron jobs

### 프론트엔드 (React)
- **프레임워크**: React 19 with Vite
- **UI 라이브러리**: React Bootstrap 2.10+ with Bootstrap 5.3+
- **상태 관리**: Zustand
- **HTTP 클라이언트**: Elysia Treaty (End-to-End Type Safety)
- **알림**: SweetAlert2
- **날짜 처리**: date-fns, react-datepicker
- **보안**: DOMPurify

### 개발 도구
- **런타임**: Bun 1.0.0+
- **패키지 매니저**: Bun (npm workspaces 호환)
- **코드 포맷팅**: Prettier
- **프로세스 관리**: Concurrently

## 프로젝트 구조

```
myTodoApp/
├── client/                      # React 프론트엔드 애플리케이션
│   ├── src/
│   │   ├── App.tsx             # 메인 애플리케이션 컴포넌트
│   │   ├── loginForm/          # 로그인/회원가입 폼
│   │   ├── todoList/           # Todo 관리 인터페이스
│   │   ├── components/         # 재사용 가능한 컴포넌트
│   │   │   ├── ChatComponent.tsx
│   │   │   ├── FileUploadComponent.tsx
│   │   │   ├── ProfileComponent.tsx
│   │   │   └── FloatingActionButton.tsx
│   │   ├── authStore/          # Zustand 인증 상태
│   │   ├── stores/             # 추가 Zustand 스토어
│   │   └── hooks/              # 커스텀 React 훅
│   └── package.json
│
├── src/                         # ElysiaJS 백엔드 애플리케이션
│   ├── main.ts                 # 애플리케이션 진입점 및 플러그인 등록
│   ├── plugins/                # 공통 플러그인 (DB, CORS, JWT, Swagger)
│   ├── features/               # 기능 모듈 (User, Todo, AI, File, Mail, Log)
│   │   ├── user/
│   │   ├── todo/
│   │   └── ...
│   ├── utils/                  # 공유 유틸리티
│   └── test/                   # 테스트
│
├── upload/                      # 파일 업로드 임시 저장소 (Cloudinary 사용)
├── .agent/                      # Agent 설정 및 스티어링 규칙
├── package.json                 # 워크스페이스 구성
├── .nvmrc                       # Node 버전 명세
└── README.md
```

## 사전 요구사항

- **Bun**: 1.0.0 이상
- **PostgreSQL**: 최신 버전

## 설치 방법

### 1. 저장소 클론 및 의존성 설치

```bash
# 저장소 클론
git clone <repository-url>
cd myTodoApp

# 의존성 설치 (루트, 백엔드, 프론트엔드)
bun install
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

# JWT 설정 (강력한 랜덤 문자열 사용)
JWT_SECRET=...

# 암호화 키 (32 bytes, Hex 형식 권장)
ENCRYPTION_KEY=...

# Cloudinary 설정
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# 메일 설정 (Gmail)
MAIL_USER=...
MAIL_PASS=...

# Baseline Browser Mapping 경고 무시 설정
BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA=true
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

```bash
# 프론트엔드와 백엔드 동시 실행
bun start

# 또는 개별 실행
bun run start:server    # 백엔드만 실행 (포트 3001)
bun run start:client    # 프론트엔드만 실행 (포트 5173)
```

### 프로덕션 빌드

```bash
# 프론트엔드와 백엔드 모두 빌드
bun run build
```

### 백엔드 전용 명령어 (src/ 디렉토리)

```bash
cd src

# 개발 모드 (핫 리로드)
bun dev

# 프로덕션 빌드 및 실행
bun run build
bun start

# 테스트 실행
bun test

# Lint 및 수정
bun run lint
```

**보안 참고**: 프로덕션 배포 시 환경 변수, 방화벽 설정, HTTPS 인증서 등을 적절히 구성하세요.

### 프론트엔드 전용 명령어 (client/ 디렉토리)

```bash
cd client

# 개발 서버
bun run dev

# 프로덕션 빌드
bun run build

# 테스트 실행
bun test
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
- **플러그인 기반 아키텍처**: 각 기능은 독립적인 Elysia 플러그인
- **리포지토리 패턴**: TypeORM 엔티티와 서비스 레이어 추상화
- **Derive 패턴**: 인증 및 상태를 위한 컨텍스트 확장
- **감사 패턴**: 모든 엔티티에 대한 표준화된 감사 컬럼

### 프론트엔드
- **컴포넌트 조합**: 작고 집중된 React 컴포넌트
- **전역 상태 관리**: Zustand를 사용한 인증 및 채팅 상태
- **타입 안전성**: Elysia Treaty를 통한 End-to-End 타입 보장
- **조건부 렌더링**: 인증 기반 컴포넌트 전환

## 코드 주석 작성 가이드라인

- **모든 코드 주석은 한글로 작성**해야 하며, 문법상 필요한 요소(예: JSDoc 태그 `@param`, `@return`)는 예외입니다
- 변수명, 함수명, 기술 용어는 영문으로 유지합니다
- 주석의 설명 내용만 한글로 작성합니다

## 보안

- Bun.password를 사용한 강력한 비밀번호 해싱 (bcrypt algorithm)
- Web Crypto API를 사용한 AES-256-GCM 데이터 암호화
- JWT 기반 인증 시스템
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

- JWT-based user authentication and registration (with privacy policy consent)
- Create, read, update, and delete todos by date
- File upload and attachment functionality (Cloudinary cloud storage)
  - Progress tracking
  - Server-side file validation (size, format, security)
  - Profile image and todo attachment support
- AI chat assistant powered by Google Gemini API
  - Multi-turn conversation support (maintains previous conversation context)
  - Can read/create/update todos
  - Real-time todo manipulation via function calling
- Profile image upload and management
- Password change functionality
- Contact Developer (send inquiry email to administrator)
- Markdown rendering (with XSS protection)
- Comprehensive audit logging and IP anonymization scheduler
- Secure credential storage via environment variables
- Data encryption (AES-256-GCM)

## Technology Stack

### Backend (ElysiaJS)
- **Framework**: ElysiaJS
- **Runtime**: Bun (Node.js compatible)
- **Language**: TypeScript
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT (stateless) with Bun.password (bcrypt algorithm)
- **Security**: AES-256-GCM encryption
- **AI**: Google Gemini API
- **API Communication**: Elysia Treaty (End-to-End Type Safety)
- **File Storage**: Cloudinary
- **Mail**: Nodemailer
- **Markdown**: marked, sanitize-html
- **Scheduler**: cron jobs

### Frontend (React)
- **Framework**: React 19 with Vite
- **UI Library**: React Bootstrap 2.10+ with Bootstrap 5.3+
- **State Management**: Zustand
- **HTTP Client**: Elysia Treaty (End-to-End Type Safety)
- **Notifications**: SweetAlert2
- **Date Handling**: date-fns, react-datepicker
- **Security**: DOMPurify

### Development Tools
- **Runtime**: Bun 1.0.0+
- **Package Manager**: Bun (npm workspaces compatible)
- **Code Formatting**: Prettier
- **Process Management**: Concurrently

## Project Structure

```
myTodoApp/
├── client/                      # React frontend application
│   ├── src/
│   │   ├── App.tsx             # Main application component
│   │   ├── loginForm/          # Login/signup forms
│   │   ├── todoList/           # Todo management interface
│   │   ├── components/         # Reusable components
│   │   │   ├── ChatComponent.tsx
│   │   │   ├── FileUploadComponent.tsx
│   │   │   ├── ProfileComponent.tsx
│   │   │   └── FloatingActionButton.tsx
│   │   ├── authStore/          # Zustand auth state
│   │   ├── stores/             # Additional Zustand stores
│   │   └── hooks/              # Custom React hooks
│   └── package.json
│
├── src/                         # ElysiaJS backend application
│   ├── main.ts                 # Application entry point & plugin registration
│   ├── plugins/                # Common plugins (DB, CORS, JWT, Swagger)
│   ├── features/               # Feature modules (User, Todo, AI, File, Mail, Log)
│   │   ├── user/
│   │   ├── todo/
│   │   └── ...
│   ├── utils/                  # Shared utilities
│   └── test/                   # Tests
│
├── upload/                      # File upload storage
├── .kiro/                       # Kiro settings and steering rules
├── package.json                 # Workspace configuration
├── .nvmrc                       # Node version specification
└── README.md
```

## Prerequisites

- **Bun**: 1.0.0 or higher
- **PostgreSQL**: Latest version

## Installation

### 1. Clone Repository and Install Dependencies

```bash
# Clone repository
git clone <repository-url>
cd myTodoApp

# Install all dependencies (root, backend, frontend)
bun install
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

# JWT configuration (use strong random string)
JWT_SECRET=...

# Encryption keys (32 bytes, Hex format recommended)
ENCRYPTION_KEY=...


# Cloudinary configuration
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Mail configuration (Gmail)
MAIL_USER=...
MAIL_PASS=...

# Baseline Browser Mapping Warning Suppression
BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA=true
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

```bash
# Run both frontend and backend
bun start

# Or run individually
bun run start:server    # Backend only (port 3001)
bun run start:client    # Frontend only (port 5173)
```

### Production Build

```bash
# Build both frontend and backend
bun run build
```

### Backend-Specific Commands (src/ directory)

```bash
cd src

# Development mode (hot reload)
bun dev

# Production build & run
bun run build
bun start

# Run tests
bun test

# Lint and fix
bun run lint
```

**Security Note**: When deploying to production, properly configure environment variables, firewall settings, HTTPS certificates, etc.

### Frontend-Specific Commands (client/ directory)

```bash
cd client

# Development server
bun run dev

# Production build
bun run build

# Run tests
bun test
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
- **Plugin-based architecture**: Each feature is a self-contained Elysia plugin
- **Repository pattern**: TypeORM entities with service layer abstraction
- **Derive pattern**: Context extension for auth and state
- **Audit pattern**: Standardized audit columns for all entities

### Frontend
- **Component composition**: Small, focused React components
- **Global state management**: Zustand for authentication and chat state
- **Type Safety**: End-to-End type safety via Elysia Treaty
- **Conditional rendering**: Auth-based component switching

## Code Comments Guidelines

- **All code comments should be written in Korean**, except for syntax-required elements (e.g., JSDoc tags like `@param`, `@return`)
- Variable names, function names, and technical terms remain in English
- Only the descriptive content of comments should be in Korean

## Security

- Strong password hashing using Bun.password (bcrypt algorithm)
- AES-256-GCM data encryption using Web Crypto API
- JWT-based authentication system
- Secure credential storage mechanism
- XSS and CSRF attack prevention
- Input validation and sanitization
- Cross-origin request control via CORS configuration

**Important**: In production environments, always apply additional security measures (HTTPS, firewall, rate limiting, etc.).

## License

UNLICENSED - Private project
