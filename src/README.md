# 백엔드 (ElysiaJS)

TO-DO List 애플리케이션의 백엔드 서버입니다. **ElysiaJS** 프레임워크와 **Bun** 런타임을 사용하여 고성능으로 구축되었으며, TypeORM을 통해 PostgreSQL 데이터베이스와 연동됩니다.

## 주요 기능

- 사용자 인증 및 JWT 관리 (개인정보 동의 포함)
- Todo CRUD 작업 및 검색, 엑셀 다운로드
- Google Gemini API를 활용한 AI 지원 (채팅, 도구 호출)
- 파일 업로드 및 관리 (Cloudinary)
- Contact Developer (문의 메일)
- 포괄적인 감사 로깅 및 IP 추적
- 환경 변수를 통한 보안 구성
- Swagger를 통한 API 문서화

## 기술 스택

- **프레임워크**: ElysiaJS
- **런타임**: Bun (Node.js 호환)
- **언어**: TypeScript
- **데이터베이스**: PostgreSQL with TypeORM
- **인증**: JWT, Bun.password
- **AI**: Google Gemini SDK (Function Calling 지원)
- **스토리지**: Cloudinary
- **메일**: Nodemailer
- **문서화**: Swagger UI

## 프로젝트 구조 (Elysia 스타일)

```
src/
├── main.ts                      # 애플리케이션 엔트리포인트 (App 등록)
├── plugins/                     # 공통 플러그인
│   ├── config.ts                # 환경설정
│   ├── cors.ts                  # CORS 설정
│   ├── database.ts              # DB 연결
│   ├── jwt.ts                   # JWT 인증
│   └── swagger.ts               # API 문서
├── features/                    # 기능 모듈 (라우트, 서비스, 스키마)
│   ├── user/                    # 사용자 기능
│   │   ├── user.routes.ts
│   │   ├── user.service.ts
│   │   ├── user.schema.ts
│   │   └── user.entity.ts
│   ├── todo/                    # 할 일 기능
│   ├── assistance/              # AI 비서 기능
│   ├── mail/                    # 메일 기능
│   └── fileUpload/              # 파일 업로드 기능
├── utils/                       # 유틸리티
│   ├── auditColumns.ts
│   └── cryptUtil.ts
└── test/                        # 테스트
```

## 사전 요구사항

- Bun 1.0.0 이상
- PostgreSQL

## 설치 및 실행

```bash
# 의존성 설치
bun install

# 개발 모드 실행 (핫 리로드)
bun dev

# 프로덕션 빌드 및 실행
bun run build
bun start
```

## API 문서

서버 실행 후 `/swagger` 경로에서 Swagger UI를 확인할 수 있습니다.
예: `http://localhost:3001/swagger`

## 환경 변수 설정

`.env` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# 데이터베이스
DB_HOST=...
DB_PORT=...
DB_USERNAME=...
DB_PASSWORD=...
DB_DATABASE=...

# 서버
PORT=3001

# JWT & 보안
JWT_SECRET=...
ENCRYPTION_KEY=...

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Mail (Gmail)
GMAIL_USER=...
GMAIL_APP_PASSWORD=...

# AI
GEMINI_API_KEY=... (User DB에 저장된 키 사용 시 불필요할 수 있으나 기본 설정 권장)
```

## 문제 해결

### 데이터베이스 연결 오류

- PostgreSQL이 실행 중인지 확인
- `.env` 파일의 데이터베이스 자격 증명 확인
- `DB_DEV_PASSWORD` 환경 변수가 올바르게 설정되어 있는지 확인

### JWT 오류

- `JWT_SECRET`이 설정되어 있는지 확인
- Authorization 헤더가 올바른지 확인

### 환경 변수 오류

- `.env` 파일에 모든 필수 환경 변수가 설정되어 있는지 확인
- `DB_DEV_PASSWORD`, `JWT_SECRET` 등이 올바르게 설정되어 있는지 확인

## 라이선스

UNLICENSED - 비공개 프로젝트

---

# Backend (NestJS)

Backend server for the TO-DO List application. Built with NestJS framework and integrated with PostgreSQL database via TypeORM.

## Key Features

- User authentication and JWT management (with privacy policy consent)
- Todo CRUD operations and date-based queries
- AI assistance powered by Google Gemini API
- File upload and management (Cloudinary cloud storage)
  - Server-side file validation (size, format, security)
  - Profile image and todo attachment support
- Contact Developer (send inquiry email to administrator)
- Comprehensive audit logging and IP anonymization scheduler
- Secure credential management via environment variables
- Data encryption (AES-256-GCM)

## Technology Stack

- **Framework**: NestJS 11.x with Express
- **Runtime**: Bun 1.0+ (Node.js compatible)
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL with TypeORM 0.3.x
- **Authentication**: JWT (stateless) with Bun.password
- **Security**: Web Crypto API (AES-256-GCM encryption)
- **AI**: Google Gemini API
- **File Storage**: Cloudinary
- **File Upload**: Multer
- **Mail**: Nodemailer
- **Markdown**: marked, sanitize-html
- **Scheduler**: @nestjs/schedule (Cron jobs)
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
│   ├── user.dto.ts
│   └── user-validation.pipe.ts
├── todo/                        # Todo module
│   ├── todo.controller.ts
│   ├── todo.service.ts
│   ├── todo.entity.ts
│   └── todo.dto.ts
├── assistance/                  # AI assistance module
│   ├── assistance.controller.ts
│   ├── assistance.service.ts
│   ├── assistance.dto.ts
│   └── gemini.interface.ts
├── fileUpload/                  # File upload module
│   ├── file.controller.ts
│   ├── cloudinary.service.ts
│   └── validation/
├── logging/                     # Logging module
│   ├── logging.service.ts
│   └── logging.entity.ts
├── utils/                       # Utilities
│   ├── cryptUtil.ts
│   ├── auditColumns.ts
│   ├── customNamingStrategy.ts
│   └── inputSanitizer.ts
├── filter/                      # Global filters
│   └── http-exception.filter.ts
├── interceptor/                 # Global interceptors
│   └── logging.interceptor.ts
├── types/                       # Type definitions
│   ├── express/
│   │   ├── auth.guard.ts
│   │   ├── auth.service.ts
│   │   └── jwt.strategy.ts
└── test/                        # E2E tests
```

## Prerequisites

- Bun 1.0.0 or higher
- PostgreSQL (latest version)

## Installation

```bash
# Install dependencies
bun install
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

# File upload configuration (optional, not needed with Cloudinary)
UPLOAD_DIR=./upload
MAX_FILE_SIZE=5242880
```

**Security Note**: Use strong passwords and secret keys in production, and manage environment variables securely.

## Running the Application

```bash
# Development mode (hot reload)
bun run start:dev

# Regular development mode
bun run start

# Debug mode
bun run start:debug

# Production build
bun run build

# Production run
bun run start:prod
```

## Testing

```bash
# Unit tests
bun test

# Unit tests (watch mode)
bun run test:watch

# E2E tests
bun run test:e2e

# Test coverage
bun run test:cov

# Run specific test file
bun test -- --testPathPattern=user.service.spec.ts

# Run tests matching pattern
bun test -- --testNamePattern="should create user"
```

## Code Quality

```bash
# Lint check
bun run lint

# Lint auto-fix
bun run lint -- --fix

# Code formatting
bun run format
```

## API Endpoints

The application provides RESTful APIs with the following main features:

- User authentication and JWT management
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

- Strong encryption algorithm for password hashing (Bun.password) and data encryption (Web Crypto API - AES-256-GCM)
- JWT-based authentication system
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

### JWT Error

- Verify `JWT_SECRET` is configured
- Check Authorization header is correct

### Environment Variable Error

- Verify all required environment variables are set in `.env` file
- Check that `DB_DEV_PASSWORD`, `JWT_SECRET` are properly configured

## License

UNLICENSED - Private project
