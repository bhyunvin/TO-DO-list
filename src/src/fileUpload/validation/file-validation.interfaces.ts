/**
 * 파일 검증 인터페이스 및 타입
 */

export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
  errorCode?: string;
}

export interface ValidationConfig {
  maxFileSize: number;
  allowedExtensions: string[];
  blockedExtensions: string[];
  maxFileCount?: number;
}

export interface FileUploadPolicyConfig {
  profileImage: {
    maxSize: number;
    allowedTypes: string[];
    maxCount: number;
  };
  todoAttachment: {
    maxSize: number;
    allowedTypes: string[];
    blockedTypes: string[];
    maxCount: number;
  };
}

export type FileCategory = 'profile_image' | 'todo_attachment';

export interface FileValidationError {
  fileName: string;
  errorCode: string;
  errorMessage: string;
  fileSize?: number;
  fileType?: string;
}
