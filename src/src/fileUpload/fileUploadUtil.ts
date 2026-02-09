import { extname } from 'node:path';
import { CloudinaryService } from './cloudinary.service';
import { UploadApiResponse } from 'cloudinary';
import { FileInfoEntity } from './file.entity';
import { Repository, EntityManager } from 'typeorm';
import { FileValidationService } from './validation/file-validation.service';
import type { FileCategory } from './validation/file-validation.interfaces';
import { FILE_UPLOAD_POLICY } from './validation/file-validation.constants';
import { AuditSettings, setAuditColumn } from '../utils/auditColumns';

/**
 * ElysiaJS 환경에 맞춘 파일 업로드 유틸리티
 */
export class FileUploadUtil {
  private readonly fileInfoRepository: Repository<FileInfoEntity>;
  private readonly cloudinaryService: CloudinaryService;
  private readonly fileValidationService: FileValidationService;

  constructor(
    repository: Repository<FileInfoEntity>,
    cloudinaryService: CloudinaryService,
  ) {
    this.fileInfoRepository = repository;
    this.cloudinaryService = cloudinaryService;
    this.fileValidationService = new FileValidationService();
  }

  // 파일 정보를 Cloudinary에 업로드하고 DB에 저장하는 함수
  async saveFileInfo(
    files: File[], // Bun/Web 표준 File 객체
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
      const processFile = async (file: File, groupNo: number) => {
        // Cloudinary 업로드
        const uploadResult = (await this.cloudinaryService.uploadFile(
          file,
        )) as UploadApiResponse;

        const originalName = file.name; // Web File API의 'name' 속성 사용
        const uploadedFileExt =
          uploadResult.format || extname(originalName).substring(1);

        const newFile = repository.create({
          fileGroupNo: groupNo,
          filePath: uploadResult.secure_url, // 로컬 경로 대신 Cloudinary URL 저장
          saveFileName: `${uploadResult.public_id}.${uploadedFileExt}`,
          originalFileName: originalName,
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

    return { savedFiles, fileGroupNo: fileGroupNo || 0 };
  }

  // 파일 검증 메서드 직접 노출 (Elysia Handler 내부에서 사용)
  validateFiles(files: File[], category: FileCategory) {
    return this.fileValidationService.validateFilesByCategory(files, category);
  }
}

// Elysia용 파일 업로드 설정 상수
export const FILE_UPLOAD_OPTIONS = {
  profileImage: {
    maxSize: FILE_UPLOAD_POLICY.profileImage.maxSize,
    maxCount: FILE_UPLOAD_POLICY.profileImage.maxCount,
  },
  todoAttachment: {
    maxSize: FILE_UPLOAD_POLICY.todoAttachment.maxSize,
    maxCount: FILE_UPLOAD_POLICY.todoAttachment.maxCount,
  },
};
