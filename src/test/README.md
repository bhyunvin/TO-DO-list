# E2E 테스트 설정 가이드

## 개요

이 디렉토리는 NestJS 백엔드 애플리케이션의 E2E(End-to-End) 테스트를 포함합니다. 테스트는 macOS Keychain과 독립적으로 작동하도록 구성되어 CI/CD 환경에서 더 이식 가능하고 실행하기 쉽습니다.

## 해결된 문제

원래 E2E 테스트는 다음과 같은 이유로 `EntityMetadataNotFoundError`와 함께 실패했습니다:

1. **비동기 구성 로딩**: `AppModule`은 런타임에 데이터베이스 비밀번호를 복호화하기 위해 `KeychainUtil`에 의존하는 `TypeOrmModule.forRootAsync()`를 사용합니다
2. **엔티티 메타데이터 누락**: 테스트 설정이 필요한 모든 TypeORM 엔티티를 제대로 가져오지 않았습니다
3. **Keychain 의존성**: 테스트가 macOS Keychain 액세스를 필요로 하여 이식성이 떨어졌습니다

## 솔루션

### 1. 테스트 헬퍼 모듈 (`test-helpers.ts`)

다음을 수행하는 중앙 집중식 테스트 구성 모듈을 생성했습니다:

- 모든 엔티티가 명시적으로 등록된 `createTestTypeOrmConfig()` 내보내기
- 민감한 데이터에 환경 변수 사용

### 2. 업데이트된 테스트 파일

`app.e2e-spec.ts`와 `profile-update-security.e2e-spec.ts` 모두 이제:

- 전체 `AppModule` 대신 개별 모듈 가져오기
- keychain 의존성을 우회하기 위해 환경 변수 사용
- 모든 엔티티로 TypeORM을 명시적으로 구성
- 테스트 실행 전에 세션 미들웨어를 올바르게 초기화

### 3. 환경 구성

- **`.env.test`**: 테스트 전용 환경 변수 템플릿
- **`setup-e2e.ts`**: 테스트 실행 전에 환경 변수를 로드하는 Jest 설정 파일
- **`jest-e2e.json`**: 설정 파일 포함 및 타임아웃 증가를 위해 업데이트됨

## E2E 테스트 실행

### 사전 요구사항

1. `.env.test`를 복사하고 테스트 데이터베이스를 구성합니다:

   ```bash
   cp .env.test .env.test.local
   # 실제 테스트 데이터베이스 자격 증명으로 .env.test.local 편집
   ```

2. 테스트 데이터베이스가 실행 중이고 액세스 가능한지 확인합니다

### 테스트 실행

```bash
# 올바른 Node 버전으로 전환
nvm use 24

# 모든 E2E 테스트 실행
npm test -- --config=test/jest-e2e.json

# 특정 테스트 파일 실행
npm test -- --config=test/jest-e2e.json app.e2e-spec

# 상세 출력으로 실행
npm test -- --config=test/jest-e2e.json --verbose
```

## 환경 변수

### E2E 테스트에 필요

- `DB_DEV_SERVER`: 데이터베이스 호스트
- `DB_DEV_PORT`: 데이터베이스 포트
- `DB_DEV_USERNAME`: 데이터베이스 사용자명
- `DB_DEV_DATABASE`: 데이터베이스 이름
- `TEST_DB_PASSWORD`: 테스트용 데이터베이스 비밀번호
- `TEST_JWT_SECRET`: 테스트용 JWT 시크릿

**보안 참고**: 테스트 환경에서도 프로덕션과 다른 자격 증명을 사용하고, 테스트 데이터베이스를 별도로 구성하세요.

## 테스트 구조

### 기본 애플리케이션 테스트

애플리케이션이 올바르게 초기화되는지 확인하는 스모크 테스트입니다.

### 보안 테스트

주요 기능에 대한 포괄적인 보안 테스트로, 다음을 포함합니다:

- 인증 및 권한 부여
- 입력 유효성 검사 및 새니타이제이션
- 인젝션 공격 방지
- XSS 공격 방지
- JWT 보안
- 감사 로깅

## 문제 해결

### EntityMetadataNotFoundError

이 오류가 여전히 표시되는 경우:

1. `test-helpers.ts`에 모든 엔티티가 가져와졌는지 확인
2. 테스트 데이터베이스에 액세스할 수 있는지 확인
3. TypeORM 구성이 데이터베이스 설정과 일치하는지 확인

### 연결 타임아웃

테스트가 타임아웃되는 경우:

1. 데이터베이스가 실행 중인지 확인
2. `.env.test`의 데이터베이스 자격 증명 확인
3. 필요한 경우 `jest-e2e.json`의 `testTimeout` 증가

### JWT 인증 문제

JWT 관련 테스트가 실패하는 경우:

1. `TEST_JWT_SECRET`이 설정되어 있는지 확인
2. 요청 헤더에 `Authorization: Bearer <token>`이 올바르게 포함되었는지 확인

## CI/CD 통합

CI/CD 파이프라인의 경우:

1. CI 시스템에서 환경 변수를 안전하게 설정합니다
2. 테스트 실행:
   ```bash
   npm test -- --config=test/jest-e2e.json --ci
   ```

**보안 참고**: CI/CD 환경 변수는 암호화하여 저장하고, 로그에 노출되지 않도록 주의하세요.

## 모범 사례

1. **격리**: 각 테스트는 `afterEach` 또는 `afterAll`에서 데이터를 정리해야 합니다
2. **멱등성**: 테스트는 부작용 없이 여러 번 실행 가능해야 합니다
3. **독립성**: 테스트는 실행 순서에 의존하지 않아야 합니다
4. **실제 데이터베이스**: E2E 테스트는 실제 데이터베이스 연결을 사용합니다 (모킹하지 않음)
5. **환경 분리**: 별도의 테스트 데이터베이스를 사용하고, 프로덕션에 대해 절대 테스트하지 마세요

## 새로운 E2E 테스트 추가

새로운 E2E 테스트 파일을 생성할 때:

1. 테스트 헬퍼 가져오기:

   ```typescript
   import { createTestTypeOrmConfig, MockKeychainUtil } from './test-helpers';
   ```

2. 명시적 가져오기로 테스트 모듈 설정:

   ```typescript
   const moduleFixture = await Test.createTestingModule({
     imports: [
       ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
       TypeOrmModule.forRoot(createTestTypeOrmConfig()),
       // ... 기타 모듈
     ],
   })
     .overrideProvider(KeychainUtil)
     .useValue(new MockKeychainUtil())
     .compile();
   ```

3. (선택 사항) JWT 테스트가 필요한 경우 토큰 생성 로직 등을 추가

4. `afterAll`에서 정리:
   ```typescript
   afterAll(async () => {
     await app.close();
   });
   ```

## 테스트 파일 목록

- `app.e2e-spec.ts` - 기본 애플리케이션 스모크 테스트
- `profile-update-security.e2e-spec.ts` - 프로필 업데이트 보안 테스트
- `test-helpers.ts` - 공유 테스트 유틸리티 및 모킹
- `setup-e2e.ts` - Jest 설정 파일
- `jest-e2e.json` - Jest E2E 구성
- `.env.test` - 테스트 환경 변수 템플릿

## 추가 리소스

- [NestJS Testing 문서](https://docs.nestjs.com/fundamentals/testing)
- [Jest 문서](https://jestjs.io/docs/getting-started)
- [Supertest 문서](https://github.com/visionmedia/supertest)
- [TypeORM Testing](https://typeorm.io/testing)

## 라이선스

UNLICENSED - 비공개 프로젝트

---

# E2E Test Setup Guide

## Overview

This directory contains end-to-end (E2E) tests for the NestJS backend application. The tests have been configured to work independently of the macOS Keychain, making them more portable and easier to run in CI/CD environments.

## Problem Solved

The original E2E tests were failing with `EntityMetadataNotFoundError` because:

1. **Async Configuration Loading**: The `AppModule` uses `TypeOrmModule.forRootAsync()` which depends on the `KeychainUtil` to decrypt database passwords at runtime
2. **Missing Entity Metadata**: The test setup wasn't properly importing all necessary TypeORM entities
3. **Keychain Dependency**: Tests required macOS Keychain access, making them non-portable

## Solution

### 1. Test Helper Module (`test-helpers.ts`)

Created a centralized test configuration module that:

- Uses environment variables instead of keychain for sensitive data

### 2. Updated Test Files

Both `app.e2e-spec.ts` and `profile-update-security.e2e-spec.ts` now:

- Import individual modules instead of the entire `AppModule`
- Use environment variables to bypass keychain dependency
- Explicitly configure TypeORM with all entities
- Properly initialize session middleware before tests run

### 3. Environment Configuration

- **`.env.test`**: Template for test-specific environment variables
- **`setup-e2e.ts`**: Jest setup file that loads environment variables before tests run
- **`jest-e2e.json`**: Updated to include setup file and increased timeout

## Running E2E Tests

### Prerequisites

1. Copy `.env.test` and configure your test database:

   ```bash
   cp .env.test .env.test.local
   # Edit .env.test.local with your actual test database credentials
   ```

2. Ensure your test database is running and accessible

### Run Tests

```bash
# Switch to correct Node version
nvm use 24

# Run all E2E tests
npm test -- --config=test/jest-e2e.json

# Run specific test file
npm test -- --config=test/jest-e2e.json app.e2e-spec

# Run with verbose output
npm test -- --config=test/jest-e2e.json --verbose
```

## Environment Variables

### Required for E2E Tests

- `DB_DEV_SERVER`: Database host
- `DB_DEV_PORT`: Database port
- `DB_DEV_USERNAME`: Database username
- `DB_DEV_DATABASE`: Database name
- `TEST_DB_PASSWORD`: Database password for tests
- `TEST_JWT_SECRET`: Session secret for tests

**Security Note**: Use different credentials for test environment than production, and configure a separate test database.

## Test Structure

### Basic Application Tests

Smoke tests to verify the app initializes correctly.

### Security Tests

Comprehensive security tests for key features, including:

- Authentication and authorization
- Input validation and sanitization
- Injection attack prevention
- XSS attack prevention
- JWT security
- Audit logging

## Troubleshooting

### EntityMetadataNotFoundError

If you still see this error:

1. Verify all entities are imported in `test-helpers.ts`
2. Check that the test database is accessible
3. Ensure TypeORM configuration matches your database setup

### Connection Timeout

If tests timeout:

1. Verify database is running
2. Check database credentials in `.env.test`
3. Increase `testTimeout` in `jest-e2e.json` if needed

### JWT Issues

If JWT-related tests fail:

1. Verify `TEST_JWT_SECRET` is set
2. Check that `Authorization` header is present

## CI/CD Integration

For CI/CD pipelines:

1. Securely configure environment variables in your CI system
2. Run tests:
   ```bash
   npm test -- --config=test/jest-e2e.json --ci
   ```

**Security Note**: Encrypt CI/CD environment variables and ensure they are not exposed in logs.

## Best Practices

1. **Isolation**: Each test should clean up its data in `afterEach` or `afterAll`
2. **Idempotency**: Tests should be runnable multiple times without side effects
3. **Independence**: Tests should not depend on execution order
4. **Real Database**: E2E tests use a real database connection (not mocked)
5. **Environment Separation**: Use a separate test database, never test against production

## Adding New E2E Tests

When creating new E2E test files:

1. Import test helpers:

   ```typescript
   import { createTestTypeOrmConfig, MockKeychainUtil } from './test-helpers';
   ```

2. Set up the test module with explicit imports:

   ```typescript
   const moduleFixture = await Test.createTestingModule({
     imports: [
       ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
       TypeOrmModule.forRoot(createTestTypeOrmConfig()),
       // ... other modules
     ],
   })
     .overrideProvider(KeychainUtil)
     .useValue(new MockKeychainUtil())
     .compile();
   ```

3. (Optional) Setup JWT generation logic if needed

4. Clean up in `afterAll`:
   ```typescript
   afterAll(async () => {
     await app.close();
   });
   ```

## Test Files List

- `app.e2e-spec.ts` - Basic application smoke tests
- `profile-update-security.e2e-spec.ts` - Profile update security tests
- `test-helpers.ts` - Shared test utilities and mocking
- `setup-e2e.ts` - Jest setup file
- `jest-e2e.json` - Jest E2E configuration
- `.env.test` - Test environment variables template

## Additional Resources

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [TypeORM Testing](https://typeorm.io/testing)

## License

UNLICENSED - Private project
