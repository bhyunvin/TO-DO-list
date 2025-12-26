import { diskStorage } from 'multer';
import { extname, resolve } from 'node:path';
import * as fs from 'node:fs';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileInfoEntity } from './file.entity';
import { FileValidationService } from './validation/file-validation.service';
import { FileCategory } from './validation/file-validation.interfaces';
import { FILE_UPLOAD_POLICY } from './validation/file-validation.constants';

import { AuditSettings, setAuditColumn } from '../utils/auditColumns';



@Injectable()
export class FileUploadUtil {
  constructor(
    @InjectRepository(FileInfoEntity)
    private readonly fileInfoRepository: Repository<FileInfoEntity>,
  ) {}

  // 파일 정보를 DB에 저장하는 함수
  async saveFileInfo(
    files: Express.Multer.File[],
    setting: AuditSettings,
  ): Promise<{ savedFiles: FileInfoEntity[]; fileGroupNo: number }> {
    const savedFiles: FileInfoEntity[] = [];
    let fileGroupNo: number | null = null;

    if (files.length > 0) {
      // 첫 번째 파일을 DB에 저장하여 fileGroupNo를 설정합니다.
      const [firstFile] = files;
      let newFirstFile = this.fileInfoRepository.create({
        fileGroupNo: 0, // 임시값: 저장 후 fileNo로 업데이트됨
        filePath: firstFile.path,
        saveFileName: firstFile.filename,
        fileExt: extname(firstFile.originalname).substring(1),
        fileSize: firstFile.size,
      });

      setting.entity = newFirstFile;
      newFirstFile = setAuditColumn(setting);

      const savedFirstFile = await this.fileInfoRepository.save(newFirstFile);
      fileGroupNo = savedFirstFile.fileNo; // 첫 번째 파일의 fileNo를 fileGroupNo로 설정

      // 첫 번째 파일의 fileGroupNo를 기준으로 업데이트합니다.
      await this.fileInfoRepository.update(
        { fileNo: fileGroupNo },
        { fileGroupNo },
      );

      // 첫 번째 파일을 savedFiles에 추가합니다.
      savedFiles.push(savedFirstFile);
    }

    if (files.length > 1) {
      // 나머지 파일들을 DB에 저장합니다.
      for (let i = 1; i < files.length; i++) {
        const file = files[i];
        let newFile = this.fileInfoRepository.create({
          fileGroupNo, // 모든 파일에 같은 fileGroupNo 설정
          filePath: file.path,
          saveFileName: file.filename,
          fileExt: extname(file.originalname).substring(1),
          fileSize: file.size,
        });

        setting.entity = newFile;
        newFile = setAuditColumn(setting);

        const savedFile = await this.fileInfoRepository.save(newFile);
        savedFiles.push(savedFile);
      }
    }

    return { savedFiles, fileGroupNo };
  }
}

// 검증 기능이 향상된 파일 필터 함수
export const createFileFilter =
  (category: FileCategory) =>
  (
    req: any,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile?: boolean) => void,
  ) => {
    const fileValidationService = new FileValidationService();
    const validationResults = fileValidationService.validateFilesByCategory(
      [file],
      category,
    );
    const [result] = validationResults;

    if (!result.isValid) {
      const error = new Error(result.errorMessage);
      (error as any).code = result.errorCode;
      return callback(error, false);
    }

    callback(null, true);
  };

// 프로필 이미지를 위한 향상된 multer 설정
export const profileImageMulterOptions = {
  storage: diskStorage({
    destination: (req, file, callback) => {
      const uploadPath = process.env.UPLOAD_FILE_DIRECTORY || resolve(process.cwd(), '../upload');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      callback(null, uploadPath);
    },
    filename: (req, file, callback) => {
      const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
      const ext = extname(file.originalname);
      const filename = `profile_${uniqueSuffix}${ext}`;
      callback(null, filename);
    },
  }),
  fileFilter: createFileFilter('profile_image'),
  limits: {
    fileSize: FILE_UPLOAD_POLICY.profileImage.maxSize,
    files: FILE_UPLOAD_POLICY.profileImage.maxCount,
  },
};

// 첨부 파일을 위한 향상된 multer 설정
export const todoAttachmentMulterOptions = {
  storage: diskStorage({
    destination: (req, file, callback) => {
      const uploadPath = process.env.UPLOAD_FILE_DIRECTORY || resolve(process.cwd(), '../upload');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      callback(null, uploadPath);
    },
    filename: (req, file, callback) => {
      const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
      const ext = extname(file.originalname);
      const filename = `todo_${uniqueSuffix}${ext}`;
      callback(null, filename);
    },
  }),
  fileFilter: createFileFilter('todo_attachment'),
  limits: {
    fileSize: FILE_UPLOAD_POLICY.todoAttachment.maxSize,
    files: FILE_UPLOAD_POLICY.todoAttachment.maxCount,
  },
};
