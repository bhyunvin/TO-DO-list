# 백엔드 (ElysiaJS)

TO-DO List 애플리케이션의 백엔드 서버입니다. **ElysiaJS** 프레임워크와 **Bun** 런타임을 사용하여 고성능으로 구축되었으며, TypeORM을 통해 PostgreSQL 데이터베이스와 연동됩니다.

## 주요 기능

- 사용자 인증 및 JWT 관리 (개인정보 동의 포함)
- Todo CRUD 작업 및 검색, 엑셀 다운로드
- Google Gemini API를 활용한 AI 지원 (채팅, 도구 호출)
- 파일 업로드 및 관리 (Cloudinary)
- Contact Developer (문의 메일)
- 포괄적인 감사 로깅 및 IP 추적 (Pino 기반 통합 로깅)
- 클라이언트 친화적인 검증 에러 응답
- 정적 파일 서빙 (`/static` 경로)
- 환경 변수를 통한 보안 구성
- Swagger를 통한 API 문서화

## 기술 스택

- **프레임워크**: ElysiaJS
- **런타임**: Bun (Node.js 호환)
- **언어**: TypeScript
- **데이터베이스**: PostgreSQL with TypeORM
- **인증**: JWT, Bun.password
- **로깅**: Pino with pino-pretty (통합 로거)
- **AI**: Google Gemini SDK (Function Calling 지원)
- **스토리지**: Cloudinary
- **정적 파일**: @elysiajs/static
- **메일**: Nodemailer
- **문서화**: Swagger UI
- **테스트**: Bun 네이티브 테스트 (Bun.test 및 fetch API)

## 프로젝트 구조 (Elysia 스타일)

```
src/
├── main.ts                      # 애플리케이션 엔트리포인트 (App 등록)
├── plugins/                     # 공통 플러그인
│   ├── config.ts                # 환경설정
│   ├── cors.ts                  # CORS 설정
│   ├── database.ts              # DB 연결
│   ├── jwt.ts                   # JWT 인증
│   ├── logger.ts                # HTTP 로깅 (Pino)
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
│   ├── cryptUtil.ts
│   ├── logger.ts                # 애플리케이션 로거
│   └── pino.ts                  # Pino 인스턴스
└── test/                        # 테스트 (Bun 네이티브)
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

# Backend (ElysiaJS)

Backend server for the TO-DO List application. Built with **ElysiaJS** framework and **Bun** runtime for high performance, integrated with PostgreSQL database via TypeORM.

## Key Features

- User authentication and JWT management (with privacy policy consent)
- Todo CRUD operations, search, and Excel download
- AI assistance powered by Google Gemini API (Chat, Tool calling)
- File upload and management (Cloudinary)
- Contact Developer (Inquiry email)
- Comprehensive audit logging and IP tracking (Pino-based unified logging)
- Client-friendly validation error responses
- Static file serving (`/static` path)
- Security configuration via environment variables
- API documentation via Swagger

## Technology Stack

- **Framework**: ElysiaJS
- **Runtime**: Bun (Node.js compatible)
- **Language**: TypeScript
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT, Bun.password
- **Logging**: Pino with pino-pretty (unified logger)
- **AI**: Google Gemini SDK (Function Calling support)
- **Storage**: Cloudinary
- **Static Files**: @elysiajs/static
- **Mail**: Nodemailer
- **Documentation**: Swagger UI
- **Testing**: Bun native testing (Bun.test and fetch API)

## Project Structure (Elysia Style)

```
src/
├── main.ts                      # Application entry point (App registration)
├── plugins/                     # Common plugins
│   ├── config.ts                # Configuration
│   ├── cors.ts                  # CORS settings
│   ├── database.ts              # DB connection
│   ├── jwt.ts                   # JWT authentication
│   ├── logger.ts                # HTTP logging (Pino)
│   └── swagger.ts               # API documentation
├── features/                    # Feature modules (Routes, Services, Schemas)
│   ├── user/                    # User features
│   │   ├── user.routes.ts
│   │   ├── user.service.ts
│   │   ├── user.schema.ts
│   │   └── user.entity.ts
│   ├── todo/                    # Todo features
│   ├── assistance/              # AI assistant features
│   ├── mail/                    # Mail features
│   └── fileUpload/              # File upload features
├── utils/                       # Utilities
│   ├── auditColumns.ts
│   ├── cryptUtil.ts
│   ├── logger.ts                # Application logger
│   └── pino.ts                  # Pino instance
└── test/                        # Tests (Bun native)
```

## Prerequisites

- Bun 1.0.0 or higher
- PostgreSQL

## Installation & Running

```bash
# Install dependencies
bun install

# Run in development mode (hot reload)
bun dev

# Production build and run
bun run build
bun start
```

## API Documentation

After starting the server, you can view Swagger UI at `/swagger`.
Example: `http://localhost:3001/swagger`

## Environment Configuration

Create a `.env` file and configure the following variables:

```env
# Database
DB_HOST=...
DB_PORT=...
DB_USERNAME=...
DB_PASSWORD=...
DB_DATABASE=...

# Server
PORT=3001

# JWT & Security
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
GEMINI_API_KEY=... (Optional if using key stored in User DB, but recommended as default)
```

## Troubleshooting

### Database Connection Error

- Verify PostgreSQL is running
- Check database credentials in `.env`
- Verify `DB_DEV_PASSWORD` environment variable is set correctly

### JWT Error

- Verify `JWT_SECRET` is set
- Check if Authorization header is correct

### Environment Variable Error

- Verify all required variables are set in `.env`
- Check `DB_DEV_PASSWORD`, `JWT_SECRET` etc.

## License

UNLICENSED - Private project
