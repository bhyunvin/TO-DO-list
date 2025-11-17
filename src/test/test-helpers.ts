import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { CustomNamingStrategy } from '../src/utils/customNamingStrategy';
import { UserEntity } from '../src/user/user.entity';
import { TodoEntity } from '../src/todo/todo.entity';
import { LogEntity } from '../src/logging/logging.entity';
import { FileInfoEntity } from '../src/fileUpload/file.entity';

/**
 * E2E 테스트용 TypeORM 설정 생성
 * 환경 변수에서 직접 데이터베이스 설정을 가져옴
 */
export const createTestTypeOrmConfig =
  async (): Promise<TypeOrmModuleOptions> => {
    return {
      type: 'postgres',
      host: process.env.DB_DEV_SERVER || 'localhost',
      port: Number(process.env.DB_DEV_PORT) || 5432,
      username: process.env.DB_DEV_USERNAME || 'postgres',
      password: process.env.DB_DEV_PASSWORD || 'test_password',
      database: process.env.DB_DEV_DATABASE || 'test_db',
      entities: [UserEntity, TodoEntity, LogEntity, FileInfoEntity],
      synchronize: false,
      namingStrategy: new CustomNamingStrategy(),
      ssl: { rejectUnauthorized: false },
    };
  };
