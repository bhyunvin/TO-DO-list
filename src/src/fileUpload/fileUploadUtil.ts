import { diskStorage } from 'multer';
import { extname } from 'path';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileInfoEntity } from './file.entity';
import { FileValidationService } from './validation/file-validation.service';
import { FileCategory } from './validation/file-validation.interfaces';
import { FILE_UPLOAD_POLICY, FILE_VALIDATION_ERRORS } from './validation/file-validation.constants';

import { AuditSettings, setAuditColumn } from '../utils/auditColumns';

const uploadFileDirectory = process.env.UPLOAD_FILE_DIRECTORY;

@Injectable()
export class FileUploadUtil {
  constructor(
    @InjectRepository(FileInfoEntity)
    private readonly fileInfoRepository: Repository<FileInfoEntity>,
    private readonly fileValidationService: FileValidationService,
  ) {}

  // 파일 정보를 DB에 저장하는 함수
  async saveFileInfo(
    files: Express.Multer.File[],
    setting: AuditSettings,
    fileCategory: FileCategory = 'todo_attachment',
  ): Promise<{ savedFiles: FileInfoEntity[]; fileGroupNo: number }> {
    const savedFiles: FileInfoEntity[] = [];
    let fileGroupNo: number | null = null;

    if (files.length > 0) {
      // 첫 번째 파일을 DB에 저장하여 fileGroupNo를 설정합니다.
      const firstFile = files[0];
      let newFirstFile = this.fileInfoRepository.create({
        filePath: firstFile.path,
        saveFileName: firstFile.filename,
        originalFileName: firstFile.originalname,
        fileExt: extname(firstFile.originalname).substring(1),
        fileSize: firstFile.size,
        fileCategory: fileCategory,
        validationStatus: 'validated',
      });

      setting.entity = newFirstFile;
      newFirstFile = setAuditColumn(setting);

      const savedFirstFile = await this.fileInfoRepository.save(newFirstFile);
      fileGroupNo = savedFirstFile.fileNo; // 첫 번째 파일의 fileNo를 fileGroupNo로 설정

      // 첫 번째 파일의 fileGroupNo를 기준으로 업데이트합니다.
      await this.fileInfoRepository.update(
        { fileNo: fileGroupNo },
        { fileGroupNo: fileGroupNo },
      );

      // 첫 번째 파일을 savedFiles에 추가합니다.
      savedFiles.push(savedFirstFile);
    }

    if (files.length > 1) {
      // 나머지 파일들을 DB에 저장합니다.
      for (let i = 1; i < files.length; i++) {
        const file = files[i];
        let newFile = this.fileInfoRepository.create({
          fileGroupNo: fileGroupNo, // 모든 파일에 같은 fileGroupNo 설정
          filePath: file.path,
          saveFileName: file.filename,
          originalFileName: file.originalname,
          fileExt: extname(file.originalname).substring(1),
          fileSize: file.size,
          fileCategory: fileCategory,
          validationStatus: 'validated',
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

// Enhanced file filter function with validation
export const createFileFilter = (category: FileCategory) => {
  return (req: any, file: Express.Multer.File, callback: Function) => {
    const fileValidationService = new FileValidationService();
    const validationResults = fileValidationService.validateFilesByCategory([file], category);
    const result = validationResults[0];

    if (!result.isValid) {
      const error = new Error(result.errorMessage);
      (error as any).code = result.errorCode;
      return callback(error, false);
    }

    callback(null, true);
  };
};

// Enhanced multer configuration for profile images
export const profileImageMulterOptions = {
  storage: diskStorage({
    destination: uploadFileDirectory,
    filename: (req, file, callback) => {
      const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1e9);
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

// Enhanced multer configuration for TODO attachments
export const todoAttachmentMulterOptions = {
  storage: diskStorage({
    destination: uploadFileDirectory,
    filename: (req, file, callback) => {
      const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1e9);
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

// Legacy multer options (for backward compatibility)
export const multerOptions = {
  storage: diskStorage({
    destination: uploadFileDirectory,
    filename: (req, file, callback) => {
      const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname);
      const filename = `${file.fieldname}_${uniqueSuffix}${ext}`;
      callback(null, filename);
    },
  }),
};
