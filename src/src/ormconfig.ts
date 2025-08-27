import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { CustomNamingStrategy } from './utils/customNamingStrategy';
import dotenv from 'dotenv';
dotenv.config();
import { decrypt } from './utils/cryptUtil';

export const ormconfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_DEV_SERVER,
  port: Number(process.env.DB_DEV_PORT),
  username: process.env.DB_DEV_USERNAME,
  password: decrypt(process.env.DB_DEV_PASSWORD),
  database: process.env.DB_DEV_DATABASE,
  entities: ['dist/**/*.entity{.ts,.js}'],
  synchronize: false,
  namingStrategy: new CustomNamingStrategy(),
  ssl: false,
};
