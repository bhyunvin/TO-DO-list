import { Elysia } from 'elysia';
import { DataSource } from 'typeorm';
import { TodoEntity } from '../todo/todo.entity';
import { UserEntity } from '../user/user.entity';
import { LogEntity } from '../logging/logging.entity';
import { FileInfoEntity } from '../fileUpload/file.entity';
import { RefreshTokenEntity } from '../user/refresh-token.entity';
import { CustomNamingStrategy } from '../utils/customNamingStrategy';

// 데이터베이스 연결 인스턴스 생성
const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_DEV_SERVER || 'localhost',
  port: parseInt(process.env.DB_DEV_PORT || '5432'),
  username: process.env.DB_DEV_USERNAME!,
  password: process.env.DB_DEV_PASSWORD!,
  database: process.env.DB_DEV_DATABASE!,
  ssl: { rejectUnauthorized: false },
  entities: [
    TodoEntity,
    UserEntity,
    LogEntity,
    FileInfoEntity,
    RefreshTokenEntity,
  ],
  namingStrategy: new CustomNamingStrategy(),
  synchronize: false,
  logging: true,
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
      console.log('✅ PostgreSQL 데이터베이스 연결 완료');
    }
  })
  .onStop(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('🔌 PostgreSQL 데이터베이스 연결 종료');
    }
  });
