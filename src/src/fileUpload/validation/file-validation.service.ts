import { extname } from 'node:path';
import {
  ValidationResult,
  ValidationConfig,
  type FileCategory,
  FileValidationError,
} from './file-validation.interfaces';
import {
  FILE_VALIDATION_ERRORS,
  FILE_VALIDATION_MESSAGES,
  FILE_UPLOAD_POLICY,
  BLOCKED_EXTENSIONS,
} from './file-validation.constants';

/**
 * 크기 및 유형 제한으로 파일 업로드를 검증하는 서비스
 */

export class FileValidationService {
  /**
   * 단일 파일의 크기를 최대 허용 크기와 비교하여 검증합니다
   */
  validateFileSize(file: File, maxSize: number): ValidationResult {
    const { size: fileSize } = file;

    if (fileSize > maxSize) {
      return {
        isValid: false,
        errorCode: FILE_VALIDATION_ERRORS.FILE_TOO_LARGE,
        errorMessage:
          FILE_VALIDATION_MESSAGES[FILE_VALIDATION_ERRORS.FILE_TOO_LARGE],
      };
    }

    return { isValid: true };
  }

  /**
   * 허용 및 차단된 확장자와 비교하여 단일 파일의 유형을 검증합니다
   */
  validateFileType(
    file: File,
    allowedTypes: string[],
    blockedTypes: string[] = [],
  ): ValidationResult {
    const fileName: string = file.name;
    const fileExtension = extname(fileName).toLowerCase();

    // 파일 유형이 명시적으로 차단되었는지 확인
    if (blockedTypes.length > 0 && blockedTypes.includes(fileExtension)) {
      return {
        isValid: false,
        errorCode: FILE_VALIDATION_ERRORS.BLOCKED_FILE_TYPE,
        errorMessage:
          FILE_VALIDATION_MESSAGES[FILE_VALIDATION_ERRORS.BLOCKED_FILE_TYPE],
      };
    }

    // 파일 유형이 허용 목록에 있는지 확인 (허용 목록이 비어있으면 모든 파일 허용)
    if (
      allowedTypes &&
      allowedTypes.length > 0 &&
      !allowedTypes.includes(fileExtension)
    ) {
      return {
        isValid: false,
        errorCode: FILE_VALIDATION_ERRORS.INVALID_FILE_TYPE,
        errorMessage:
          FILE_VALIDATION_MESSAGES[FILE_VALIDATION_ERRORS.INVALID_FILE_TYPE],
      };
    }

    return { isValid: true };
  }

  /**
   * 제공된 구성에 따라 여러 파일을 검증합니다
   */
  validateMultipleFiles(
    files: File[],
    config: ValidationConfig,
  ): ValidationResult[] {
    const { maxFileCount, maxFileSize, allowedExtensions, blockedExtensions } =
      config;

    // 파일 개수 제한 확인
    if (maxFileCount && files.length > maxFileCount) {
      return files.map(() => ({
        isValid: false,
        errorCode: FILE_VALIDATION_ERRORS.TOO_MANY_FILES,
        errorMessage:
          FILE_VALIDATION_MESSAGES[FILE_VALIDATION_ERRORS.TOO_MANY_FILES],
      }));
    }

    // 각 파일을 개별적으로 검증
    return files.map((file) => {
      const sizeValidation = this.validateFileSize(file, maxFileSize);
      if (!sizeValidation.isValid) {
        return sizeValidation;
      }

      return this.validateFileType(file, allowedExtensions, blockedExtensions);
    });
  }

  /**
   * 카테고리(profileImage 또는 todoAttachment)에 따라 파일을 검증합니다
   */
  validateFilesByCategory(
    files: File[],
    category: FileCategory,
  ): ValidationResult[] {
    // snake_case 카테고리를 camelCase 정책 키로 매핑
    const policyKey =
      category === 'profile_image' ? 'profileImage' : 'todoAttachment';
    const policyConfig = FILE_UPLOAD_POLICY[policyKey];

    if (!policyConfig) {
      throw new Error(`잘못된 파일 카테고리: ${category}`);
    }

    const config = policyConfig as { blockedTypes?: string[] };
    const validationConfig: ValidationConfig = {
      maxFileSize: policyConfig.maxSize,
      allowedExtensions: policyConfig.allowedTypes,
      blockedExtensions:
        category === 'todo_attachment'
          ? config.blockedTypes || BLOCKED_EXTENSIONS
          : BLOCKED_EXTENSIONS,
      maxFileCount: policyConfig.maxCount,
    };

    return this.validateMultipleFiles(files, validationConfig);
  }

  /**
   * 검증에 실패한 파일에 대한 검증 오류를 가져옵니다
   */
  getValidationErrors(
    files: File[],
    validationResults: ValidationResult[],
  ): FileValidationError[] {
    return files.reduce((errors, file, i) => {
      const result = validationResults[i];

      if (!result.isValid) {
        const fileName = file.name;
        const { size: fileSize } = file;
        const fileType = extname(fileName).toLowerCase();

        errors.push({
          fileName,
          errorCode: result.errorCode || 'UNKNOWN_ERROR',
          errorMessage: result.errorMessage || '알 수 없는 검증 오류',
          fileSize,
          fileType,
        });
      }

      return errors;
    }, [] as FileValidationError[]);
  }

  /**
   * 유효하지 않은 파일을 필터링하고 유효한 파일만 반환합니다
   */
  getValidFiles(files: File[], validationResults: ValidationResult[]): File[] {
    return files.filter((_, i) => validationResults[i].isValid);
  }

  /**
   * 파일 크기를 사람이 읽을 수 있는 형식으로 포맷합니다
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return (
      Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    );
  }

  /**
   * 특정 카테고리에 대해 파일 유형이 유효한지 확인합니다
   */
  isValidFileType(
    fileName: string,
    allowedTypes: string[],
    blockedTypes: string[] = [],
  ): boolean {
    const fileExtension = extname(fileName).toLowerCase();

    // 차단되었는지 확인
    if (blockedTypes.includes(fileExtension)) {
      return false;
    }

    // 허용되었는지 확인
    return allowedTypes.includes(fileExtension);
  }
}
