# 백엔드 (NestJS)

TO-DO List 애플리케이션의 백엔드 서버입니다. NestJS 프레임워크를 사용하여 구축되었으며, TypeORM을 통해 PostgreSQL 데이터베이스와 연동됩니다.

## 주요 기능

- 사용자 인증 및 세션 관리
- Todo CRUD 작업 및 날짜 기반 쿼리
- Google Gemini API를 활용한 AI 지원
- 파일 업로드 및 관리
- 포괄적인 감사 로깅
- 환경 변수를 통한 보안 자격 증명 관리

## 기술 스택

- **프레임워크**: NestJS 11.x with Express
- **언어**: TypeScript 5.x
- **데이터베이스**: PostgreSQL with TypeORM 0.3.x
- **인증**: Express Session with bcrypt
- **AI**: Google Gemini API via @nestjs/axios
- **파일 업로드**: Multer
- **마크다운**: marked, sanitize-html
- **테스트**: Jest, Supertest

## 프로젝트 구조

```
src/
├── main.ts                      # 애플리케이션 부트스트랩
├── app.module.ts                # 루트 모듈
├── user/                        # 사용자 모듈
│   ├── user.controller.ts
│   ├── user.service.ts
│   ├── user.entity.ts
│   └── dto/
├── todo/                        # Todo 모듈
│   ├── todo.controller.ts
│   ├── todo.service.ts
│   ├── todo.entity.ts
│   └── dto/
├── assistance/                  # AI 지원 모듈
│   ├── assistance.controller.ts
│   ├── assistance.service.ts
│   └── dto/
├── fileUpload/                  # 파일 업로드 모듈
│   ├── fileUpload.controller.ts
│   └── fileUpload.service.ts
├── logging/                     # 로깅 모듈
│   ├── logging.service.ts
│   └── logging.entity.ts
├── utils/                       # 유틸리티
│   ├── crypto.util.ts
│   ├── audit-columns.ts
│   └── naming-strategy.ts
├── filter/                      # 전역 필터
│   └── http-exception.filter.ts
├── interceptor/                 # 전역 인터셉터
│   └── logging.interceptor.ts
├── types/                       # 타입 정의
│   └── express/
└── test/                        # E2E 테스트
```

## 사전 요구사항

- Node.js 24.0.0 이상
- npm 8 이상
- PostgreSQL (최신 버전)
- nvm (권장)

## 설치 방법

```bash
# Node 버전 설정 (필수)
nvm use 24

# 의존성 설치
npm install
```

## 환경 변수 설정

`.env` 파일을 생성하고 다음 변수들을 설정하세요:

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

# 파일 업로드 설정
UPLOAD_DIR=...
MAX_FILE_SIZE=...
```

**보안 참고**: 프로덕션 환경에서는 강력한 비밀번호와 시크릿 키를 사용하고, 환경 변수를 안전하게 관리하세요.

## 실행 방법

```bash
# Node 버전 설정 (필수)
nvm use 24

# 개발 모드 (핫 리로드)
npm run start:dev

# 일반 개발 모드
npm run start

# 디버그 모드
npm run start:debug

# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm run start:prod
```

## 테스트

```bash
# Node 버전 설정 (필수)
nvm use 24

# 단위 테스트
npm test

# 단위 테스트 (watch 모드)
npm run test:watch

# E2E 테스트
npm run test:e2e

# 테스트 커버리지
npm run test:cov

# 특정 테스트 파일 실행
npm test -- --testPathPattern=user.service.spec.ts

# 특정 테스트 이름 패턴으로 실행
npm test -- --testNamePattern="should create user"
```

## 코드 품질

```bash
# Lint 검사
npm run lint

# Lint 자동 수정
npm run lint -- --fix

# 코드 포맷팅
npm run format
```

## API 엔드포인트

애플리케이션은 RESTful API를 제공하며, 다음과 같은 주요 기능을 포함합니다:

- 사용자 인증 및 세션 관리
- 사용자 프로필 관리
- Todo 항목 CRUD 작업
- AI 채팅 지원
- 파일 업로드

자세한 API 명세는 별도의 API 문서를 참조하세요.

## 데이터베이스

### 명명 규칙

- **테이블**: 프로젝트 접두사 + snake_case
- **컬럼**: snake_case
- **엔티티**: PascalCase + `Entity` 접미사
- **DTO**: PascalCase + `Dto` 접미사

### 주요 기능

- 사용자 정보 관리
- Todo 항목 저장
- 감사 로그 기록
- 자동 타임스탬프 관리

## 보안

- 강력한 암호화 알고리즘을 사용한 비밀번호 해싱
- 세션 기반 인증 시스템
- 안전한 자격 증명 저장 메커니즘
- XSS 및 CSRF 공격 방지
- 입력 유효성 검사 및 새니타이제이션
- CORS 설정을 통한 교차 출처 요청 제어
- 인증 가드를 통한 라우트 보호

**중요**: 프로덕션 환경에서는 추가적인 보안 조치(HTTPS, 방화벽, 레이트 리미팅, 보안 헤더 등)를 반드시 적용하세요.

## 아키텍처 패턴

- **모듈 기반 아키텍처**: 각 기능은 독립적인 NestJS 모듈
- **리포지토리 패턴**: TypeORM 엔티티와 서비스 레이어 추상화
- **가드 패턴**: 인증 가드를 통한 라우트 보호
- **인터셉터 패턴**: 로깅 및 에러 처리
- **감사 패턴**: 모든 엔티티에 표준화된 감사 컬럼

## 코드 주석 작성 가이드라인

- **모든 코드 주석은 한글로 작성**해야 하며, 문법상 필요한 요소(예: JSDoc 태그)는 예외입니다
- 변수명, 함수명, 기술 용어는 영문으로 유지합니다
- 주석의 설명 내용만 한글로 작성합니다

## 문제 해결

### 데이터베이스 연결 오류

- PostgreSQL이 실행 중인지 확인
- `.env` 파일의 데이터베이스 자격 증명 확인
- `DB_DEV_PASSWORD` 환경 변수가 올바르게 설정되어 있는지 확인

### 세션 오류

- `SESSION_SECRET`이 설정되어 있는지 확인
- 세션 스토어가 올바르게 구성되어 있는지 확인

### 환경 변수 오류

- `.env` 파일에 모든 필수 환경 변수가 설정되어 있는지 확인
- `DB_DEV_PASSWORD`, `SESSION_SECRET`, `GEMINI_API_KEY` 등이 올바르게 설정되어 있는지 확인

## 라이선스

UNLICENSED - 비공개 프로젝트

---

# Backend (NestJS)

Backend server for the TO-DO List application. Built with NestJS framework and integrated with PostgreSQL database via TypeORM.

## Key Features

- User authentication and session management
- Todo CRUD operations and date-based queries
- AI assistance powered by Google Gemini API
- File upload and management
- Comprehensive audit logging
- Secure credential management via environment variables

## Technology Stack

- **Framework**: NestJS 11.x with Express
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL with TypeORM 0.3.x
- **Authentication**: Express Session with bcrypt
- **AI**: Google Gemini API via @nestjs/axios
- **File Upload**: Multer
- **Markdown**: marked, sanitize-html
- **Testing**: Jest, Supertest

## Project Structure

```
src/
├── main.ts                      # Application bootstrap
├── app.module.ts                # Root module
├── user/                        # User module
│   ├── user.controller.ts
│   ├── user.service.ts
│   ├── user.entity.ts
│   └── dto/
├── todo/                        # Todo module
│   ├── todo.controller.ts
│   ├── todo.service.ts
│   ├── todo.entity.ts
│   └── dto/
├── assistance/                  # AI assistance module
│   ├── assistance.controller.ts
│   ├── assistance.service.ts
│   └── dto/
├── fileUpload/                  # File upload module
│   ├── fileUpload.controller.ts
│   └── fileUpload.service.ts
├── logging/                     # Logging module
│   ├── logging.service.ts
│   └── logging.entity.ts
├── utils/                       # Utilities
│   ├── crypto.util.ts
│   ├── audit-columns.ts
│   └── naming-strategy.ts
├── filter/                      # Global filters
│   └── http-exception.filter.ts
├── interceptor/                 # Global interceptors
│   └── logging.interceptor.ts
├── types/                       # Type definitions
│   └── express/
└── test/                        # E2E tests
```

## Prerequisites

- Node.js 24.0.0 or higher
- npm 8 or higher
- PostgreSQL (latest version)
- nvm (recommended)

## Installation

```bash
# Set Node version (required)
nvm use 24

# Install dependencies
npm install
```

## Environment Configuration

Create a `.env` file and configure the following variables:

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

# File upload configuration
UPLOAD_DIR=...
MAX_FILE_SIZE=...
```

**Security Note**: Use strong passwords and secret keys in production, and manage environment variables securely.

## Running the Application

```bash
# Set Node version (required)
nvm use 24

# Development mode (hot reload)
npm run start:dev

# Regular development mode
npm run start

# Debug mode
npm run start:debug

# Production build
npm run build

# Production run
npm run start:prod
```

## Testing

```bash
# Set Node version (required)
nvm use 24

# Unit tests
npm test

# Unit tests (watch mode)
npm run test:watch

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Run specific test file
npm test -- --testPathPattern=user.service.spec.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create user"
```

## Code Quality

```bash
# Lint check
npm run lint

# Lint auto-fix
npm run lint -- --fix

# Code formatting
npm run format
```

## API Endpoints

The application provides RESTful APIs with the following main features:

- User authentication and session management
- User profile management
- Todo item CRUD operations
- AI chat assistance
- File upload

For detailed API specifications, please refer to the separate API documentation.

## Database

### Naming Conventions

- **Tables**: Project prefix + snake_case
- **Columns**: snake_case
- **Entities**: PascalCase + `Entity` suffix
- **DTOs**: PascalCase + `Dto` suffix

### Main Features

- User information management
- Todo item storage
- Audit log recording
- Automatic timestamp management

## Security

- Strong encryption algorithm for password hashing
- Session-based authentication system
- Secure credential storage mechanism
- XSS and CSRF attack prevention
- Input validation and sanitization
- Cross-origin request control via CORS configuration
- Route protection via authentication guards

**Important**: In production environments, always apply additional security measures (HTTPS, firewall, rate limiting, security headers, etc.).

## Architecture Patterns

- **Module-based architecture**: Each feature is a self-contained NestJS module
- **Repository pattern**: TypeORM entities with service layer abstraction
- **Guard pattern**: Route protection via authentication guards
- **Interceptor pattern**: Logging and error handling
- **Audit pattern**: Standardized audit columns for all entities

## Code Comments Guidelines

- **All code comments should be written in Korean**, except for syntax-required elements (e.g., JSDoc tags)
- Variable names, function names, and technical terms remain in English
- Only the descriptive content of comments should be in Korean

## Troubleshooting

### Database Connection Error

- Verify PostgreSQL is running
- Check database credentials in `.env` file
- Verify `DB_DEV_PASSWORD` environment variable is properly set

### Session Error

- Verify `SESSION_SECRET` is configured
- Check session store is properly configured

### Environment Variable Error

- Verify all required environment variables are set in `.env` file
- Check that `DB_DEV_PASSWORD`, `SESSION_SECRET`, `GEMINI_API_KEY` are properly configured

## License

UNLICENSED - Private project
