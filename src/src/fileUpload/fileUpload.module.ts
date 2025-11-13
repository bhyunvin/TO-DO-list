// src/fileUpload/file-upload.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileInfoEntity } from './file.entity';
import { FileUploadUtil } from './fileUploadUtil';
import {
  FileValidationService,
  FileUploadErrorService,
  ProfileImageValidationInterceptor,
  TodoAttachmentValidationInterceptor,
} from './validation';

@Module({
  imports: [TypeOrmModule.forFeature([FileInfoEntity])],
  providers: [
    FileUploadUtil,
    FileValidationService,
    FileUploadErrorService,
    ProfileImageValidationInterceptor,
    TodoAttachmentValidationInterceptor,
  ],
  exports: [
    FileUploadUtil,
    FileValidationService,
    FileUploadErrorService,
    ProfileImageValidationInterceptor,
    TodoAttachmentValidationInterceptor,
  ],
})
export class FileUploadModule {}
