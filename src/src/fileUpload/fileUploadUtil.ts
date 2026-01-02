import { memoryStorage } from 'multer';
import { extname } from 'node:path';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { FileInfoEntity } from './file.entity';
import { FileValidationService } from './validation/file-validation.service';
import { FileCategory } from './validation/file-validation.interfaces';
import { FILE_UPLOAD_POLICY } from './validation/file-validation.constants';
import { CloudinaryService } from './cloudinary.service';
import { UploadApiResponse } from 'cloudinary';

import { AuditSettings, setAuditColumn } from '../utils/auditColumns';

@Injectable()
export class FileUploadUtil {
  constructor(
    @InjectRepository(FileInfoEntity)
    private readonly fileInfoRepository: Repository<FileInfoEntity>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // 파일 정보를 Cloudinary에 업로드하고 DB에 저장하는 함수
  async saveFileInfo(
    files: Express.Multer.File[],
    setting: AuditSettings,
    manager?: EntityManager,
  ): Promise<{ savedFiles: FileInfoEntity[]; fileGroupNo: number }> {
    const repository = manager
      ? manager.getRepository(FileInfoEntity)
      : this.fileInfoRepository;
    const savedFiles: FileInfoEntity[] = [];
    let fileGroupNo: number | null = null;

    if (files.length > 0) {
      // 0. Cloudinary 업로드 및 Entity 생성 헬퍼
      const processFile = async (
        file: Express.Multer.File,
        groupNo: number,
      ) => {
        const uploadResult = (await this.cloudinaryService.uploadFile(
          file,
        )) as UploadApiResponse;

        const uploadedFileExt =
          uploadResult.format || extname(file.originalname).substring(1);
        const newFile = repository.create({
          fileGroupNo: groupNo,
          filePath: uploadResult.secure_url, // 로컬 경로 대신 Cloudinary URL 저장
          saveFileName: `${uploadResult.public_id}.${uploadedFileExt}`,
          fileExt: uploadedFileExt,
          fileSize: uploadResult.bytes,
        });

        setting.entity = newFile;
        return setAuditColumn(setting);
      };

      // 1. 첫 번째 파일 처리
      const firstFile = files[0];
      // 임시 groupNo 0으로 생성
      const newFirstFile = await processFile(firstFile, 0);
      const savedFirstFile = await repository.save(newFirstFile);

      fileGroupNo = savedFirstFile.fileNo;

      // fileGroupNo 업데이트
      await repository.update({ fileNo: fileGroupNo }, { fileGroupNo });
      savedFirstFile.fileGroupNo = fileGroupNo; // 메모리 객체 업데이트
      savedFiles.push(savedFirstFile);

      // 2. 나머지 파일 처리
      if (files.length > 1) {
        for (let i = 1; i < files.length; i++) {
          const newFile = await processFile(files[i], fileGroupNo);
          const savedFile = await repository.save(newFile);
          savedFiles.push(savedFile);
        }
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
  storage: memoryStorage(),
  fileFilter: createFileFilter('profile_image'),
  limits: {
    fileSize: FILE_UPLOAD_POLICY.profileImage.maxSize,
    files: FILE_UPLOAD_POLICY.profileImage.maxCount,
  },
};

// 첨부 파일을 위한 향상된 multer 설정
export const todoAttachmentMulterOptions = {
  storage: memoryStorage(),
  fileFilter: createFileFilter('todo_attachment'),
  limits: {
    fileSize: FILE_UPLOAD_POLICY.todoAttachment.maxSize,
    files: FILE_UPLOAD_POLICY.todoAttachment.maxCount,
  },
};
