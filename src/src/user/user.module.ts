// src/user/user.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './user.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { FileUploadModule } from '../fileUpload/fileUpload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    FileUploadModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}