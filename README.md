# TO-DO List 애플리케이션

이 프로젝트는 NestJS 기반의 백엔드와 React 기반의 프론트엔드로 구성된 TO-DO 리스트 애플리케이션입니다.

## 프로젝트 구조

```
myTodoApp/
├── client/           # React 프론트엔드
├── src/              # NestJS 백엔드
├── upload/           # 파일 업로드 디렉토리
├── .gitignore
├── package.json      # 루트 패키지 설정
└── README.md
```

## 기술 스택

### 백엔드 (NestJS)

- Node.js
- NestJS
- TypeORM
- PostgreSQL
- Express

### 프론트엔드 (React)

- React 18
- React Bootstrap
- Axios (API 통신)
- SweetAlert2 (알림)

## 개발 환경 설정

### 사전 요구사항

- Node.js (v16 이상)
- npm (v8 이상)
- PostgreSQL

### 설치 방법

1. 의존성 설치

```bash
# 루트 디렉토리에서
npm install
```

2. 환경 변수 설정
   프로젝트 루트에 `.env` 파일을 확인하고 다음 변수들을 설정하세요.

```env
# 데이터베이스 설정
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_DATABASE=todo_db

# 서버 포트
PORT=3001
```

## 실행 방법

```bash
# 프로젝트 루트에서 실행
npm start
```
