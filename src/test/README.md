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
- Provides `MockKeychainUtil` to replace the real keychain service
- Exports `createTestTypeOrmConfig()` with all entities explicitly registered
- Uses environment variables instead of keychain for sensitive data

### 2. Updated Test Files

Both `app.e2e-spec.ts` and `profile-update-security.e2e-spec.ts` now:
- Import individual modules instead of the entire `AppModule`
- Use `MockKeychainUtil` to bypass keychain dependency
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

- `DB_DEV_SERVER`: Database host (default: localhost)
- `DB_DEV_PORT`: Database port (default: 5432)
- `DB_DEV_USERNAME`: Database username (default: postgres)
- `DB_DEV_DATABASE`: Database name (default: test_db)
- `TEST_DB_PASSWORD`: Database password for tests
- `TEST_SESSION_SECRET`: Session secret for tests

### Optional

- `GEMINI_API_KEY`: Required if testing AI assistance features

## Test Structure

### `app.e2e-spec.ts`
Basic application smoke tests to verify the app initializes correctly.

### `profile-update-security.e2e-spec.ts`
Comprehensive security tests for the profile update feature, including:
- Authentication and authorization
- Input validation and sanitization
- SQL injection prevention
- XSS attack prevention
- Rate limiting
- File upload security
- Session security
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

### Session Issues

If session-related tests fail:
1. Verify `TEST_SESSION_SECRET` is set
2. Check that session middleware is properly initialized in test setup

## CI/CD Integration

For CI/CD pipelines:

1. Set environment variables in your CI system:
   ```bash
   export TEST_DB_PASSWORD="your_ci_db_password"
   export TEST_SESSION_SECRET="your_ci_session_secret"
   export DB_DEV_SERVER="ci_database_host"
   ```

2. Run tests:
   ```bash
   npm test -- --config=test/jest-e2e.json --ci
   ```

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

3. Initialize session middleware if needed:
   ```typescript
   const sessionSecret = await mockKeychainUtil.getPassword('encrypt-session-key');
   app.use(session({ /* config */ }));
   ```

4. Clean up in `afterAll`:
   ```typescript
   afterAll(async () => {
     await app.close();
   });
   ```
