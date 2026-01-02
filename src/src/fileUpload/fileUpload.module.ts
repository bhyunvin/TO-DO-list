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
import { FileController } from './file.controller';
import { CloudinaryProvider } from './cloudinary.provider';
import { CloudinaryService } from './cloudinary.service';

@Module({
  imports: [TypeOrmModule.forFeature([FileInfoEntity])],
  providers: [
    FileUploadUtil,
    FileValidationService,
    FileUploadErrorService,
    ProfileImageValidationInterceptor,
    TodoAttachmentValidationInterceptor,
    CloudinaryProvider,
    CloudinaryService,
  ],
  controllers: [FileController],
  exports: [
    FileUploadUtil,
    FileValidationService,
    FileUploadErrorService,
    ProfileImageValidationInterceptor,
    TodoAttachmentValidationInterceptor,
    CloudinaryProvider,
    CloudinaryService,
  ],
})
export class FileUploadModule {}
