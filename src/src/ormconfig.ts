import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { CustomNamingStrategy } from './utils/customNamingStrategy';
import dotenv from 'dotenv';
dotenv.config();

export const ormconfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_DEV_SERVER,
  port: Number(process.env.DB_DEV_PORT),
  username: process.env.DB_DEV_USERNAME,
  password: process.env.DB_DEV_PASSOWRD,
  database: process.env.DB_DEV_DATEBASE,
  entities: ['dist/**/*.entity{.ts,.js}'],
  synchronize: true,
  namingStrategy: new CustomNamingStrategy(),
};
