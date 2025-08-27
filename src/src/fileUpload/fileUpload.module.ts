// src/fileUpload/file-upload.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileInfoEntity } from './file.entity';
import { FileUploadUtil } from './fileUploadUtil';

@Module({
  imports: [
    TypeOrmModule.forFeature([FileInfoEntity]),
  ],
  providers: [FileUploadUtil],
  exports: [FileUploadUtil], 
})
export class FileUploadModule {}