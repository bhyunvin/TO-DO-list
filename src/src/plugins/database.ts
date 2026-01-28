import { Elysia } from 'elysia';
import { DataSource } from 'typeorm';
import { TodoEntity } from '../features/todo/todo.entity';
import { UserEntity } from '../features/user/user.entity';
import { FileInfoEntity } from '../fileUpload/file.entity';
import { RefreshTokenEntity } from '../features/user/refresh-token.entity';
import { LogEntity } from '../features/logging/log.entity';
import { CustomNamingStrategy } from '../utils/customNamingStrategy';
import { Logger } from '../utils/logger';
import { env } from './config';

const logger = new Logger('DatabasePlugin');

/**
 * 데이터베이스 연결 인스턴스 생성
 *
 * config.ts에서 검증된 환경 변수(env 객체)를 사용하여
 * 타입 안전성과 일관성을 보장합니다.
 */
export const dataSource = new DataSource({
  type: 'postgres',
  host: env.DB_DEV_SERVER,
  port: env.DB_DEV_PORT,
  username: env.DB_DEV_USERNAME,
  password: env.DB_DEV_PASSWORD,
  database: env.DB_DEV_DATABASE,
  ssl: { rejectUnauthorized: false },
  entities: [
    TodoEntity,
    UserEntity,
    FileInfoEntity,
    RefreshTokenEntity,
    LogEntity,
  ],
  namingStrategy: new CustomNamingStrategy(),
  synchronize: false,
  logging: env.NODE_ENV === 'production' ? ['error', 'warn'] : true,
});

/**
 * 데이터베이스 플러그인
 * TypeORM DataSource를 Elysia 인스턴스에 주입합니다.
 */
export const databasePlugin = new Elysia({ name: 'database' })
  .decorate('db', dataSource)
  .onStart(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
      logger.log('✅ PostgreSQL 데이터베이스 연결 완료');
    }
  })
  .onStop(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      logger.log('🔌 PostgreSQL 데이터베이스 연결 종료');
    }
  });
