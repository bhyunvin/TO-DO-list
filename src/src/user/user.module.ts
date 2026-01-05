// src/user/user.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './user.entity';
import { FileInfoEntity } from '../fileUpload/file.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { FileUploadModule } from '../fileUpload/fileUpload.module';
import { InputSanitizerService } from '../utils/inputSanitizer';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, FileInfoEntity]),
    FileUploadModule,
  ],
  controllers: [UserController],
  providers: [UserService, InputSanitizerService],
  exports: [UserService],
})
export class UserModule {}
