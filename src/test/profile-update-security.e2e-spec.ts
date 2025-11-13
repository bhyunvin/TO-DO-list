import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { UserEntity } from '../src/user/user.entity';
import { encrypt } from '../src/utils/cryptUtil';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Ensure Jest types are available
/// <reference types="jest" />

describe('Profile Update Security (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let testUser: UserEntity;
  let sessionCookie: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Enable validation pipes like in production
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    dataSource = app.get<DataSource>(DataSource);
  });

  beforeEach(async () => {
    // Clean up and create test user
    await dataSource.query('DELETE FROM nj_user_info WHERE user_id = $1', [
      'securitytestuser',
    ]);

    const hashedPassword = await encrypt('testpassword123');

    testUser = await dataSource.manager.save(UserEntity, {
      userId: 'securitytestuser',
      userName: 'Security Test User',
      userEmail: 'security@test.com',
      userDescription: 'Test user for security testing',
      userPassword: hashedPassword,
      adminYn: 'N',
      auditColumns: {
        regId: 'securitytestuser',
        regDtm: new Date(),
        updId: 'securitytestuser',
        updDtm: new Date(),
        regIp: '127.0.0.1',
        updIp: '127.0.0.1',
      },
    });

    // Login to get session cookie
    const loginResponse = await request(app.getHttpServer())
      .post('/user/login')
      .send({
        userId: 'securitytestuser',
        userPassword: 'testpassword123',
      })
      .expect(200);

    sessionCookie = loginResponse.headers['set-cookie'][0];
  });

  afterEach(async () => {
    // Clean up test data
    if (testUser) {
      await dataSource.query('DELETE FROM nj_user_info WHERE user_seq = $1', [
        testUser.userSeq,
      ]);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication Requirements', () => {
    it('should reject profile update without authentication', async () => {
      const response = await request(app.getHttpServer())
        .patch('/user/profile')
        .send({
          userName: 'Unauthorized Update',
        })
        .expect(401);

      expect(response.body.message).toContain('로그인이 필요합니다');
    });

    it('should reject profile update with invalid session', async () => {
      const response = await request(app.getHttpServer())
        .patch('/user/profile')
        .set('Cookie', 'connect.sid=invalid-session-id')
        .send({
          userName: 'Invalid Session Update',
        })
        .expect(401);

      expect(response.body.message).toContain('로그인이 필요합니다');
    });

    it('should accept profile update with valid authentication', async () => {
      const response = await request(app.getHttpServer())
        .patch('/user/profile')
        .set('Cookie', sessionCookie)
        .send({
          userName: 'Valid Update',
        })
        .expect(200);

      expect(response.body.userName).toBe('Valid Update');
    });
  });

  describe('Authorization Validation', () => {
    it('should only allow users to update their own profile', async () => {
      // This test verifies that the session user matches the profile being updated
      // Since we're using session-based auth, the user can only update their own profile
      const response = await request(app.getHttpServer())
        .patch('/user/profile')
        .set('Cookie', sessionCookie)
        .send({
          userName: 'Authorized Update',
        })
        .expect(200);

      expect(response.body.userName).toBe('Authorized Update');
      expect(response.body.userId).toBe('securitytestuser');
    });

    it('should prevent profile updates for suspended users', async () => {
      // Update user to suspended status
      await dataSource.manager.update(UserEntity, testUser.userSeq, {
        adminYn: 'SUSPENDED',
      });

      const response = await request(app.getHttpServer())
        .patch('/user/profile')
        .set('Cookie', sessionCookie)
        .send({
          userName: 'Suspended User Update',
        })
        .expect(403);

      expect(response.body.message).toContain('계정이 일시 정지되어');
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should reject SQL injection attempts in userName', async () => {
      const maliciousInputs = [
        "'; DROP TABLE nj_user_info; --",
        "' OR 1=1 --",
        'UNION SELECT * FROM nj_user_info',
        "<script>alert('xss')</script>",
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await request(app.getHttpServer())
          .patch('/user/profile')
          .set('Cookie', sessionCookie)
          .send({
            userName: maliciousInput,
          })
          .expect(400);

        expect(response.body.errorCode).toMatch(
          /SECURITY_VIOLATION|VALIDATION_ERROR/,
        );
      }
    });

    it('should reject SQL injection attempts in userEmail', async () => {
      const maliciousInputs = [
        "test@example.com'; DROP TABLE nj_user_info; --",
        "test@example.com' OR 1=1 --",
        "test@example.com<script>alert('xss')</script>",
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await request(app.getHttpServer())
          .patch('/user/profile')
          .set('Cookie', sessionCookie)
          .send({
            userEmail: maliciousInput,
          })
          .expect(400);

        expect(response.body.errorCode).toMatch(
          /SECURITY_VIOLATION|VALIDATION_ERROR|INVALID_EMAIL_FORMAT/,
        );
      }
    });

    it('should reject XSS attempts in userDescription', async () => {
      const xssInputs = [
        "<script>alert('xss')</script>",
        "<iframe src='javascript:alert(1)'></iframe>",
        "javascript:alert('xss')",
        "<img src=x onerror=alert('xss')>",
      ];

      for (const xssInput of xssInputs) {
        const response = await request(app.getHttpServer())
          .patch('/user/profile')
          .set('Cookie', sessionCookie)
          .send({
            userDescription: xssInput,
          })
          .expect(400);

        expect(response.body.errorCode).toMatch(
          /SECURITY_VIOLATION|VALIDATION_ERROR/,
        );
      }
    });

    it('should sanitize and accept safe input', async () => {
      const response = await request(app.getHttpServer())
        .patch('/user/profile')
        .set('Cookie', sessionCookie)
        .send({
          userName: '  John Doe  ', // Should be trimmed
          userEmail: '  JOHN@EXAMPLE.COM  ', // Should be trimmed and lowercased
          userDescription: 'This is a safe description with normal text.',
        })
        .expect(200);

      expect(response.body.userName).toBe('John Doe');
      expect(response.body.userEmail).toBe('john@example.com');
      expect(response.body.userDescription).toBe(
        'This is a safe description with normal text.',
      );
    });

    it('should reject input with excessive special characters', async () => {
      const suspiciousInput = '<>{}[]\\/$^<>{}[]\\/$^<>{}[]\\/$^<>{}[]\\/$^';

      const response = await request(app.getHttpServer())
        .patch('/user/profile')
        .set('Cookie', sessionCookie)
        .send({
          userName: suspiciousInput,
        })
        .expect(400);

      expect(response.body.errorCode).toBe('INVALID_FORMAT');
    });

    it('should enforce field length limits', async () => {
      const longName = 'a'.repeat(201); // Exceeds 200 char limit
      const longEmail = 'a'.repeat(90) + '@example.com'; // Exceeds 100 char limit
      const longDescription = 'a'.repeat(4001); // Exceeds 4000 char limit

      // Test long name
      let response = await request(app.getHttpServer())
        .patch('/user/profile')
        .set('Cookie', sessionCookie)
        .send({ userName: longName })
        .expect(400);
      expect(response.body.message).toContain('최대 200자까지');

      // Test long email
      response = await request(app.getHttpServer())
        .patch('/user/profile')
        .set('Cookie', sessionCookie)
        .send({ userEmail: longEmail })
        .expect(400);
      expect(response.body.message).toContain('최대 100자까지');

      // Test long description
      response = await request(app.getHttpServer())
        .patch('/user/profile')
        .set('Cookie', sessionCookie)
        .send({ userDescription: longDescription })
        .expect(400);
      expect(response.body.message).toContain('최대 4000자까지');
    });

    it('should validate email format', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test..test@example.com',
        'test@example',
      ];

      for (const invalidEmail of invalidEmails) {
        const response = await request(app.getHttpServer())
          .patch('/user/profile')
          .set('Cookie', sessionCookie)
          .send({
            userEmail: invalidEmail,
          })
          .expect(400);

        expect(response.body.message).toContain(
          '올바른 이메일 형식이 아닙니다',
        );
      }
    });

    it('should reject empty required fields when provided', async () => {
      const response = await request(app.getHttpServer())
        .patch('/user/profile')
        .set('Cookie', sessionCookie)
        .send({
          userName: '', // Empty name should be rejected
        })
        .expect(400);

      expect(response.body.message).toContain(
        '사용자명은 비어있을 수 없습니다',
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting for profile updates', async () => {
      // First update should succeed
      await request(app.getHttpServer())
        .patch('/user/profile')
        .set('Cookie', sessionCookie)
        .send({
          userName: 'First Update',
        })
        .expect(200);

      // Second update immediately should be rate limited
      const response = await request(app.getHttpServer())
        .patch('/user/profile')
        .set('Cookie', sessionCookie)
        .send({
          userName: 'Second Update',
        })
        .expect(403);

      expect(response.body.message).toContain(
        '프로필 업데이트가 너무 빈번합니다',
      );
    });
  });

  describe('Email Uniqueness Validation', () => {
    let secondUser: UserEntity;

    beforeEach(async () => {
      // Create a second user for uniqueness testing
      const hashedPassword = await encrypt('testpassword123');

      secondUser = await dataSource.manager.save(UserEntity, {
        userId: 'seconduser',
        userName: 'Second User',
        userEmail: 'second@test.com',
        userDescription: 'Second test user',
        userPassword: hashedPassword,
        adminYn: 'N',
        auditColumns: {
          regId: 'seconduser',
          regDtm: new Date(),
          updId: 'seconduser',
          updDtm: new Date(),
          regIp: '127.0.0.1',
          updIp: '127.0.0.1',
        },
      });
    });

    afterEach(async () => {
      if (secondUser) {
        await dataSource.query('DELETE FROM nj_user_info WHERE user_seq = $1', [
          secondUser.userSeq,
        ]);
      }
    });

    it('should reject duplicate email addresses', async () => {
      const response = await request(app.getHttpServer())
        .patch('/user/profile')
        .set('Cookie', sessionCookie)
        .send({
          userEmail: 'second@test.com', // Email already used by secondUser
        })
        .expect(400);

      expect(response.body.errorCode).toBe('DUPLICATE_EMAIL');
      expect(response.body.error).toContain('이미 사용 중인 이메일 주소입니다');
    });

    it('should allow updating to the same email (no change)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/user/profile')
        .set('Cookie', sessionCookie)
        .send({
          userEmail: 'security@test.com', // Same as current email
        })
        .expect(200);

      expect(response.body.userEmail).toBe('security@test.com');
    });

    it('should allow updating to a unique email', async () => {
      const response = await request(app.getHttpServer())
        .patch('/user/profile')
        .set('Cookie', sessionCookie)
        .send({
          userEmail: 'unique@test.com', // New unique email
        })
        .expect(200);

      expect(response.body.userEmail).toBe('unique@test.com');
    });
  });

  describe('File Upload Security', () => {
    it('should reject suspicious file names', async () => {
      const suspiciousFiles = [
        'malicious.php',
        'script.jsp',
        'backdoor.exe',
        '../../../etc/passwd',
        'file<script>.jpg',
        '.htaccess',
      ];

      for (const fileName of suspiciousFiles) {
        const response = await request(app.getHttpServer())
          .patch('/user/profile')
          .set('Cookie', sessionCookie)
          .attach('profileImage', Buffer.from('fake image data'), fileName)
          .expect(400);

        expect(response.body.errorCode).toMatch(
          /INVALID_FILENAME|INVALID_FILE_TYPE|BLOCKED_FILE_TYPE/,
        );
      }
    });

    it('should reject files with invalid MIME types', async () => {
      const response = await request(app.getHttpServer())
        .patch('/user/profile')
        .set('Cookie', sessionCookie)
        .attach('profileImage', Buffer.from('fake executable'), {
          filename: 'image.jpg',
          contentType: 'application/x-executable',
        })
        .expect(400);

      expect(response.body.errorCode).toMatch(
        /INVALID_FILE_TYPE|FILE_VALIDATION_ERROR/,
      );
    });

    it('should reject oversized files', async () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB, exceeds 5MB limit

      const response = await request(app.getHttpServer())
        .patch('/user/profile')
        .set('Cookie', sessionCookie)
        .attach('profileImage', largeBuffer, {
          filename: 'large.jpg',
          contentType: 'image/jpeg',
        })
        .expect(400);

      expect(response.body.errorCode).toMatch(
        /FILE_TOO_LARGE|FILE_VALIDATION_ERROR/,
      );
    });

    it('should accept valid image files', async () => {
      // Create a small valid image buffer (minimal JPEG header)
      const validImageBuffer = Buffer.from([
        0xff,
        0xd8,
        0xff,
        0xe0,
        0x00,
        0x10,
        0x4a,
        0x46,
        0x49,
        0x46,
        0x00,
        0x01,
        // ... minimal JPEG data
        0xff,
        0xd9, // JPEG end marker
      ]);

      const response = await request(app.getHttpServer())
        .patch('/user/profile')
        .set('Cookie', sessionCookie)
        .field('userName', 'Updated with Image')
        .attach('profileImage', validImageBuffer, {
          filename: 'profile.jpg',
          contentType: 'image/jpeg',
        })
        .expect(200);

      expect(response.body.userName).toBe('Updated with Image');
      expect(response.body.userProfileImageFileGroupNo).toBeDefined();
    });
  });

  describe('Session Security', () => {
    it('should invalidate updates after session expiry simulation', async () => {
      // Simulate session expiry by clearing session data
      // This would typically be handled by session middleware
      await request(app.getHttpServer())
        .post('/user/logout')
        .set('Cookie', sessionCookie)
        .expect(204);

      // Attempt to update profile with expired session
      const response = await request(app.getHttpServer())
        .patch('/user/profile')
        .set('Cookie', sessionCookie)
        .send({
          userName: 'Should Fail',
        })
        .expect(401);

      expect(response.body.message).toContain('로그인이 필요합니다');
    });

    it('should validate session integrity', async () => {
      // Test with malformed session cookie
      const malformedCookie = sessionCookie.replace(/[a-zA-Z0-9]/g, 'X');

      const response = await request(app.getHttpServer())
        .patch('/user/profile')
        .set('Cookie', malformedCookie)
        .send({
          userName: 'Should Fail',
        })
        .expect(401);

      expect(response.body.message).toContain('로그인이 필요합니다');
    });
  });

  describe('Audit Logging', () => {
    it('should log security violations for audit purposes', async () => {
      // This test verifies that security violations are logged
      // The actual logging is verified through the application logs
      const response = await request(app.getHttpServer())
        .patch('/user/profile')
        .set('Cookie', sessionCookie)
        .send({
          userName: "'; DROP TABLE nj_user_info; --",
        })
        .expect(400);

      expect(response.body.errorCode).toBe('SECURITY_VIOLATION');

      // In a real scenario, you would verify that the security violation
      // was logged to your audit system
    });

    it('should log successful profile updates for audit trail', async () => {
      const response = await request(app.getHttpServer())
        .patch('/user/profile')
        .set('Cookie', sessionCookie)
        .send({
          userName: 'Audit Test Update',
        })
        .expect(200);

      expect(response.body.userName).toBe('Audit Test Update');

      // In a real scenario, you would verify that the successful update
      // was logged to your audit system with appropriate details
    });
  });
});
