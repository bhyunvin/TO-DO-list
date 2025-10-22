// src/fileUpload/file-upload.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileInfoEntity } from './file.entity';
import { FileUploadUtil } from './fileUploadUtil';
import { 
  FileValidationService,
  ProfileImageValidationInterceptor,
  TodoAttachmentValidationInterceptor,
} from './validation';

@Module({
  imports: [TypeOrmModule.forFeature([FileInfoEntity])],
  providers: [
    FileUploadUtil, 
    FileValidationService,
    ProfileImageValidationInterceptor,
    TodoAttachmentValidationInterceptor,
  ],
  exports: [
    FileUploadUtil, 
    FileValidationService,
    ProfileImageValidationInterceptor,
    TodoAttachmentValidationInterceptor,
  ],
})
export class FileUploadModule {}
