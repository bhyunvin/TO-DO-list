# 프로젝트 구조

## 모노레포 구성

```
myTodoApp/
├── client/              # React 프론트엔드 애플리케이션
├── src/                 # ElysiaJS 백엔드 애플리케이션
├── node_modules/        # 루트 의존성
├── package.json         # 워크스페이스 구성
└── .nvmrc              # Node 버전 명세
```

## 백엔드 구조 (`src/`)

### 핵심 애플리케이션
- `src/main.ts` - 애플리케이션 진입점 (App 설정, 플러그인 등록)
- `src/plugins/` - 공통 플러그인 (Db, CORS, JWT, Swagger)

### 기능 모듈 (도메인 주도)
- `src/features/user/` - 사용자 인증 및 관리
- `src/features/todo/` - Todo CRUD 작업
- `src/features/assistance/` - AI 지원 통합
- `src/features/fileUpload/` - 파일 업로드 처리
- `src/features/mail/` - 이메일 서비스
- `src/features/logging/` - 로깅 서비스

### 인프라
- `src/utils/` - 공유 유틸리티
- `src/test/` - 테스트

### 구성
- `src/plugins/config.ts` - 환경 설정

## 프론트엔드 구조 (`client/`)

### 핵심 애플리케이션
- `src/App.tsx` - 인증 라우팅을 포함한 메인 애플리케이션 컴포넌트
- `src/index.tsx` - React 애플리케이션 진입점

### 기능 컴포넌트
- `src/loginForm/` - 인증 폼 (로그인/회원가입)
- `src/todoList/` - Todo 관리 인터페이스
- `src/components/` - 재사용 가능한 UI 컴포넌트 (채팅, 파일 업로드, 프로필, 플로팅 액션 버튼, 테마 토글)
- `src/authStore/` - Zustand 인증 상태 관리
- `src/stores/` - 추가 Zustand 스토어 (채팅, 테마)
- `src/hooks/` - 커스텀 React 훅 (스크롤 잠금, 파일 업로드)

### 구성
- `vite.config.ts` - Vite 구성
- `public/` - 정적 자산 및 HTML 템플릿

## 명명 규칙

### 백엔드
- **엔티티**: `Entity` 접미사를 가진 PascalCase (`UserEntity`)
- **라우트**: `Routes` 접미사를 가진 PascalCase (`UserRoutes`)
- **서비스**: `Service` 접미사를 가진 PascalCase (`UserService`)
- **DTO**: `Dto` 접미사를 가진 PascalCase (`CreateTodoDto`)
- **데이터베이스 테이블**: `nj_` 접두사를 가진 Snake case (`nj_user_info`)
- **데이터베이스 컬럼**: Snake case (`user_seq`, `reg_dtm`)

### 프론트엔드
- **컴포넌트**: PascalCase (`LoginForm`, `TodoList`)
- **파일**: 컴포넌트는 PascalCase, 유틸리티는 camelCase
- **CSS**: 클래스 이름은 camelCase, 파일은 kebab-case

## 아키텍처 패턴

### 백엔드 패턴
- **플러그인 기반 아키텍처** - 각 기능은 독립적인 Elysia 플러그인
- **리포지토리 패턴** - 서비스 레이어 추상화를 가진 TypeORM 엔티티
- **Derive 패턴** - 인증 및 상태를 위한 컨텍스트 확장
- **감사 패턴** - 모든 엔티티에 대한 표준화된 감사 컬럼

### 프론트엔드 패턴
- **컴포넌트 조합** - 작고 집중된 React 컴포넌트
- **전역 상태 관리** - 인증, 채팅, 테마 상태를 위한 Zustand
- **타입 안전성** - Elysia Treaty를 통한 엔드투엔드 타입 보장
- **조건부 렌더링** - 인증 기반 컴포넌트 전환
- **CSS Custom Properties** - CSS 변수를 사용한 동적 테마 적용

## 파일 구성 규칙
- 관련 파일을 기능 디렉토리에 그룹화
- 공유 유틸리티를 전용 `utils/` 디렉토리에 보관
- 적절한 레벨에서 구성 파일 분리
- 일관된 파일 확장자 사용 (백엔드는 `.ts`, 프론트엔드는 `.tsx`/`.ts`)

## 코드 주석 작성 가이드라인
- **모든 코드 주석은 한글로 작성**해야 하며, 문법상 필요한 요소만 예외
- 인라인 주석, 블록 주석, JSX 주석, JSDoc 문서화 주석 모두 포함
- 변수명, 함수명, 기술 용어는 영문으로 유지
- 주석의 설명 내용만 한글로 작성