import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { CustomNamingStrategy } from '../src/utils/customNamingStrategy';
import { UserEntity } from '../src/user/user.entity';
import { TodoEntity } from '../src/todo/todo.entity';
import { LogEntity } from '../src/logging/logging.entity';
import { FileInfoEntity } from '../src/fileUpload/file.entity';
import { decrypt } from '../src/utils/cryptUtil';

/**
 * E2E 테스트용 KeychainUtil 모킹 클래스
 * 실제 macOS 키체인 대신 환경 변수에서 값을 가져옴
 */
export class MockKeychainUtil {
  async getPassword(account: string): Promise<string | null> {
    // 테스트 환경에서는 환경 변수에서 직접 값을 가져옴
    if (account === 'encrypt-db-password') {
      return process.env.TEST_DB_PASSWORD || 'test_password';
    }
    if (account === 'encrypt-session-key') {
      return process.env.TEST_SESSION_SECRET || 'test_session_secret_key_for_e2e_testing';
    }
    return null;
  }
}

/**
 * E2E 테스트용 TypeORM 설정 생성
 * 실제 데이터베이스 연결을 사용하되, 키체인 의존성을 제거
 */
export const createTestTypeOrmConfig = async (): Promise<TypeOrmModuleOptions> => {
  // 환경 변수에서 암호화된 비밀번호를 가져와 복호화
  const encryptedPassword = process.env.TEST_DB_PASSWORD;
  let dbPassword = 'test_password';

  if (encryptedPassword) {
    try {
      // 비밀번호가 암호화되어 있으면 복호화
      dbPassword = await decrypt(encryptedPassword);
    } catch (error) {
      // 복호화 실패 시 원본 값 사용 (이미 평문일 수 있음)
      console.warn('⚠️  Failed to decrypt TEST_DB_PASSWORD, using as plain text');
      dbPassword = encryptedPassword;
    }
  }

  return {
    type: 'postgres',
    host: process.env.DB_DEV_SERVER || 'localhost',
    port: Number(process.env.DB_DEV_PORT) || 5432,
    username: process.env.DB_DEV_USERNAME || 'postgres',
    password: dbPassword,
    database: process.env.DB_DEV_DATABASE || 'test_db',
    entities: [UserEntity, TodoEntity, LogEntity, FileInfoEntity],
    synchronize: false,
    namingStrategy: new CustomNamingStrategy(),
    ssl: { rejectUnauthorized: false },
  };
};
