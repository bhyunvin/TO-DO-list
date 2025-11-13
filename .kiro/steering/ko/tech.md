# 기술 스택

## 백엔드 (NestJS)
- **프레임워크**: Express 어댑터를 사용하는 NestJS
- **언어**: TypeScript
- **데이터베이스**: TypeORM을 사용하는 PostgreSQL
- **인증**: bcrypt 비밀번호 해싱을 사용하는 Express 세션
- **보안**: 안전한 자격 증명 저장을 위한 Keychain 통합
- **AI 통합**: 함수 호출 기능을 갖춘 @nestjs/axios를 통한 Google Gemini API
- **파일 업로드**: multipart form 처리를 위한 Multer
- **마크다운 처리**: 마크다운 파싱을 위한 marked, XSS 보호를 위한 sanitize-html

## 프론트엔드 (React)
- **프레임워크**: Create React App을 사용하는 React 19
- **UI 라이브러리**: Bootstrap 5.3+를 사용하는 React Bootstrap 2.10+
- **상태 관리**: 전역 상태를 위한 Zustand (인증 및 채팅)
- **HTTP 클라이언트**: Axios (setupProxy.js를 통해 구성)
- **알림**: SweetAlert2
- **날짜 처리**: date-fns 및 react-datepicker
- **보안**: HTML 새니타이제이션을 위한 DOMPurify

## 개발 도구
- **패키지 매니저**: workspaces를 사용하는 npm
- **코드 포맷팅**: Prettier (작은따옴표, 후행 쉼표)
- **프로세스 관리**: 여러 서비스 실행을 위한 Concurrently
- **Node 버전**: 24.0.0+ (.nvmrc로 관리)

## 공통 명령어

**중요**: 올바른 Node.js 버전을 보장하기 위해 모든 명령어 실행 전에 항상 `nvm use 24`를 실행하세요.

### 개발
```bash
# 올바른 Node 버전으로 전환 (필수)
nvm use 24

# 프론트엔드와 백엔드 모두 시작
npm start

# 백엔드만 시작
npm run start:server

# 프론트엔드만 시작
npm run start:client

# 두 애플리케이션 모두 빌드
npm run build
```

### 백엔드 전용 (src/ 디렉토리에서)
```bash
# 올바른 Node 버전으로 전환 (필수)
nvm use 24

# 핫 리로드를 사용한 개발
npm run start:dev

# 프로덕션 빌드
npm run build

# 테스트 실행
npm test

# Lint 및 수정
npm run lint
```

### 프론트엔드 전용 (client/ 디렉토리에서)
```bash
# 올바른 Node 버전으로 전환 (필수)
nvm use 24

# 개발 서버
npm start

# 프로덕션 빌드
npm run build

# 테스트 실행
npm test
```

### 테스트 명령어
```bash
# 올바른 Node 버전으로 전환 (필수)
nvm use 24

# 특정 테스트 파일 실행
npm test -- --testPathPatterns=filename.spec.ts

# 특정 패턴으로 테스트 실행
npm test -- --testNamePattern="test name pattern"
```

## 환경 설정
- 백엔드: `src/` 디렉토리의 `.env`
- 프론트엔드: `client/` 디렉토리의 `.env`
- 데이터베이스 자격 증명은 macOS Keychain에 안전하게 저장됨
