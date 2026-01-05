// src/user/user.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './user.entity';
import { FileInfoEntity } from '../fileUpload/file.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { FileUploadModule } from '../fileUpload/fileUpload.module';
import { InputSanitizerService } from '../utils/inputSanitizer';
import { AuthModule } from '../types/express/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, FileInfoEntity]),
    FileUploadModule,
    AuthModule,
  ],
  controllers: [UserController],
  providers: [UserService, InputSanitizerService],
  exports: [UserService],
})
export class UserModule {}
