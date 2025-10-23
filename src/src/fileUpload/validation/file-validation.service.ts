import { Injectable } from '@nestjs/common';
import { extname } from 'path';
import {
  ValidationResult,
  ValidationConfig,
  FileCategory,
  FileValidationError,
} from './file-validation.interfaces';
import {
  FILE_VALIDATION_ERRORS,
  FILE_VALIDATION_MESSAGES,
  FILE_UPLOAD_POLICY,
  BLOCKED_EXTENSIONS,
} from './file-validation.constants';

/**
 * Service for validating file uploads with size and type restrictions
 */
@Injectable()
export class FileValidationService {
  /**
   * Validates a single file's size against the maximum allowed size
   */
  validateFileSize(
    file: File | Express.Multer.File,
    maxSize: number,
  ): ValidationResult {
    const fileSize = file.size;
    
    if (fileSize > maxSize) {
      return {
        isValid: false,
        errorCode: FILE_VALIDATION_ERRORS.FILE_TOO_LARGE,
        errorMessage: FILE_VALIDATION_MESSAGES[FILE_VALIDATION_ERRORS.FILE_TOO_LARGE],
      };
    }

    return { isValid: true };
  }

  /**
   * Validates a single file's type against allowed and blocked extensions
   */
  validateFileType(
    file: File | Express.Multer.File,
    allowedTypes: string[],
    blockedTypes: string[] = [],
  ): ValidationResult {
    const fileName = 'originalname' in file ? file.originalname : file.name;
    const fileExtension = extname(fileName).toLowerCase();

    // Check if file type is explicitly blocked
    if (blockedTypes.length > 0 && blockedTypes.includes(fileExtension)) {
      return {
        isValid: false,
        errorCode: FILE_VALIDATION_ERRORS.BLOCKED_FILE_TYPE,
        errorMessage: FILE_VALIDATION_MESSAGES[FILE_VALIDATION_ERRORS.BLOCKED_FILE_TYPE],
      };
    }

    // Check if file type is in allowed list
    if (!allowedTypes.includes(fileExtension)) {
      return {
        isValid: false,
        errorCode: FILE_VALIDATION_ERRORS.INVALID_FILE_TYPE,
        errorMessage: FILE_VALIDATION_MESSAGES[FILE_VALIDATION_ERRORS.INVALID_FILE_TYPE],
      };
    }

    return { isValid: true };
  }

  /**
   * Validates multiple files against the provided configuration
   */
  validateMultipleFiles(
    files: File[] | Express.Multer.File[],
    config: ValidationConfig,
  ): ValidationResult[] {
    const results: ValidationResult[] = [];

    // Check file count limit
    if (config.maxFileCount && files.length > config.maxFileCount) {
      return files.map(() => ({
        isValid: false,
        errorCode: FILE_VALIDATION_ERRORS.TOO_MANY_FILES,
        errorMessage: FILE_VALIDATION_MESSAGES[FILE_VALIDATION_ERRORS.TOO_MANY_FILES],
      }));
    }

    // Validate each file individually
    for (const file of files) {
      const sizeValidation = this.validateFileSize(file, config.maxFileSize);
      if (!sizeValidation.isValid) {
        results.push(sizeValidation);
        continue;
      }

      const typeValidation = this.validateFileType(
        file,
        config.allowedExtensions,
        config.blockedExtensions,
      );
      results.push(typeValidation);
    }

    return results;
  }

  /**
   * Validates files based on their category (profile_image or todo_attachment)
   */
  validateFilesByCategory(
    files: File[] | Express.Multer.File[],
    category: FileCategory,
  ): ValidationResult[] {
    // Map snake_case category to camelCase policy key
    const policyKey = category === 'profile_image' ? 'profileImage' : 'todoAttachment';
    const policyConfig = FILE_UPLOAD_POLICY[policyKey];
    
    if (!policyConfig) {
      throw new Error(`Invalid file category: ${category}`);
    }
    
    const validationConfig: ValidationConfig = {
      maxFileSize: policyConfig.maxSize,
      allowedExtensions: policyConfig.allowedTypes,
      blockedExtensions: category === 'todo_attachment' 
        ? (policyConfig as any).blockedTypes || BLOCKED_EXTENSIONS 
        : BLOCKED_EXTENSIONS,
      maxFileCount: policyConfig.maxCount,
    };

    return this.validateMultipleFiles(files, validationConfig);
  }

  /**
   * Gets validation errors for files that failed validation
   */
  getValidationErrors(
    files: File[] | Express.Multer.File[],
    validationResults: ValidationResult[],
  ): FileValidationError[] {
    const errors: FileValidationError[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = validationResults[i];

      if (!result.isValid) {
        const fileName = 'originalname' in file ? file.originalname : file.name;
        const fileSize = file.size;
        const fileType = extname(fileName).toLowerCase();

        errors.push({
          fileName,
          errorCode: result.errorCode!,
          errorMessage: result.errorMessage!,
          fileSize,
          fileType,
        });
      }
    }

    return errors;
  }

  /**
   * Filters out invalid files and returns only valid ones
   */
  getValidFiles(
    files: File[] | Express.Multer.File[],
    validationResults: ValidationResult[],
  ): (File | Express.Multer.File)[] {
    const validFiles: (File | Express.Multer.File)[] = [];

    for (let i = 0; i < files.length; i++) {
      if (validationResults[i].isValid) {
        validFiles.push(files[i]);
      }
    }

    return validFiles;
  }

  /**
   * Formats file size in human-readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Checks if a file type is valid for a specific category
   */
  isValidFileType(
    fileName: string,
    allowedTypes: string[],
    blockedTypes: string[] = [],
  ): boolean {
    const fileExtension = extname(fileName).toLowerCase();

    // Check if blocked
    if (blockedTypes.includes(fileExtension)) {
      return false;
    }

    // Check if allowed
    return allowedTypes.includes(fileExtension);
  }
}