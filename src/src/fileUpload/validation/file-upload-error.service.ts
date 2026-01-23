import { extname } from 'node:path';
import {
  FileValidationError,
  ValidationResult,
  type FileCategory,
} from './file-validation.interfaces';
import {
  FILE_VALIDATION_ERRORS,
  FILE_VALIDATION_MESSAGES,
} from './file-validation.constants';

// ... 인터페이스 정의는 유지 ...
export interface FileUploadErrorResponse {
  success: false;
  message: string;
  errors: FileValidationError[];
  uploadedFiles?: any[];
  timestamp: string;
  requestId?: string;
}

export interface FileUploadSuccessResponse {
  success: true;
  message: string;
  uploadedFiles: any[];
  timestamp: string;
  requestId?: string;
}

export interface ErrorLogContext {
  clientIp: string;
  userAgent: string;
  userId?: number;
  category: FileCategory;
  requestId?: string;
  endpoint: string;
}

export class FileUploadErrorService {
  // Logger -> console 대체

  /**
   * 파일 업로드 실패에 대한 표준화된 에러 응답 생성
   */
  createErrorResponse(
    errors: FileValidationError[],
    message?: string,
    uploadedFiles?: any[],
    requestId?: string,
  ): FileUploadErrorResponse {
    return {
      success: false,
      message: message || this.generateErrorMessage(errors),
      errors,
      uploadedFiles: uploadedFiles || [],
      timestamp: new Date().toISOString(),
      requestId,
    };
  }

  /**
   * 파일 업로드를 위한 표준화된 성공 응답 생성
   */
  createSuccessResponse(
    uploadedFiles: any[],
    message?: string,
    requestId?: string,
  ): FileUploadSuccessResponse {
    return {
      success: true,
      message:
        message ||
        `${uploadedFiles.length}개 파일이 성공적으로 업로드되었습니다`,
      uploadedFiles,
      timestamp: new Date().toISOString(),
      requestId,
    };
  }

  /**
   * 검증 에러로부터 사용자 친화적인 에러 메시지 생성
   */
  generateErrorMessage(errors: FileValidationError[]): string {
    if (errors.length === 0) {
      return '파일 업로드에 실패했습니다';
    }

    if (errors.length === 1) {
      const [firstError] = errors;
      return `파일 "${firstError.fileName}": ${this.getUserFriendlyMessage(firstError)}`;
    }

    // 여러 오류 - 오류 유형별로 그룹화
    const errorGroups = this.groupErrorsByType(errors);
    const messages: string[] = [];

    for (const [, fileErrors] of Object.entries(errorGroups)) {
      if (fileErrors.length === 1) {
        const [error] = fileErrors;
        messages.push(
          `"${error.fileName}": ${this.getUserFriendlyMessage(error)}`,
        );
      } else {
        const fileNames = fileErrors
          .map(({ fileName }) => `"${fileName}"`)
          .join(', ');
        const [firstError] = fileErrors;
        messages.push(
          `${fileNames}: ${this.getUserFriendlyMessage(firstError)}`,
        );
      }
    }

    return messages.join('; ');
  }

  /**
   * 추가 컨텍스트와 함께 사용자 친화적인 에러 메시지 가져오기
   */
  getUserFriendlyMessage(error: FileValidationError): string {
    const baseMessage =
      FILE_VALIDATION_MESSAGES[error.errorCode] || error.errorMessage;

    switch (error.errorCode) {
      case FILE_VALIDATION_ERRORS.FILE_TOO_LARGE: {
        const sizeInfo = error.fileSize
          ? ` (${this.formatFileSize(error.fileSize)})`
          : '';
        return `${baseMessage}${sizeInfo}`;
      }

      case FILE_VALIDATION_ERRORS.INVALID_FILE_TYPE:
      case FILE_VALIDATION_ERRORS.BLOCKED_FILE_TYPE: {
        const typeInfo = error.fileType ? ` (${error.fileType})` : '';
        return `${baseMessage}${typeInfo}`;
      }

      default:
        return baseMessage;
    }
  }

  /**
   * 더 나은 메시지 포맷팅을 위해 에러 코드별로 에러 그룹화
   */
  private groupErrorsByType(
    errors: FileValidationError[],
  ): Record<string, FileValidationError[]> {
    return errors.reduce(
      (groups, error) => {
        const { errorCode } = error;
        if (!groups[errorCode]) {
          groups[errorCode] = [];
        }
        groups[errorCode].push(error);
        return groups;
      },
      {} as Record<string, FileValidationError[]>,
    );
  }

  /**
   * 차단된 파일 시도에 대한 보안 이벤트 로깅
   */
  logSecurityEvent(
    files: any[],
    errors: FileValidationError[],
    context: ErrorLogContext,
  ): void {
    const securityErrors = errors.filter(
      ({ errorCode }) => errorCode === FILE_VALIDATION_ERRORS.BLOCKED_FILE_TYPE,
    );

    if (securityErrors.length === 0) {
      return;
    }

    securityErrors.forEach(({ fileName, fileType, fileSize }) => {
      console.warn(`보안 경고: 차단된 파일 형식 업로드 시도`, {
        fileName,
        fileType,
        fileSize,
        clientIp: context.clientIp,
        userAgent: context.userAgent,
        userId: context.userId,
        category: context.category,
        endpoint: context.endpoint,
        requestId: context.requestId,
        timestamp: new Date().toISOString(),
      });
    });
  }

  logValidationErrors(
    files: any[],
    errors: FileValidationError[],
    context: ErrorLogContext,
  ): void {
    const nonSecurityErrors = errors.filter(
      ({ errorCode }) => errorCode !== FILE_VALIDATION_ERRORS.BLOCKED_FILE_TYPE,
    );

    if (nonSecurityErrors.length === 0) {
      return;
    }

    console.warn(`${nonSecurityErrors.length}개 파일 검증 실패`, {
      errors: nonSecurityErrors.map(
        ({ fileName, errorCode, fileSize, fileType }) => ({
          fileName,
          errorCode,
          fileSize,
          fileType,
        }),
      ),
      clientIp: context.clientIp,
      userAgent: context.userAgent,
      userId: context.userId,
      category: context.category,
      endpoint: context.endpoint,
      requestId: context.requestId,
      timestamp: new Date().toISOString(),
    });
  }

  logSuccessfulUpload(uploadedFiles: any[], context: ErrorLogContext): void {
    console.log(
      `${uploadedFiles.length}개 파일이 성공적으로 업로드되었습니다`,
      {
        fileCount: uploadedFiles.length,
        files: uploadedFiles.map((file) => ({
          fileName: file.originalFileName || file.fileName,
          fileSize: file.fileSize,
          category: context.category,
        })),
        userId: context.userId,
        category: context.category,
        endpoint: context.endpoint,
        requestId: context.requestId,
        timestamp: new Date().toISOString(),
      },
    );
  }

  /**
   * 요청으로부터 에러 로깅 컨텍스트 추출
   */
  extractErrorContext(
    request: any,
    category: FileCategory,
    userId?: number,
  ): ErrorLogContext {
    return {
      clientIp: request.ip || request.socket?.remoteAddress || 'unknown',
      userAgent: request.headers['user-agent'] || 'unknown',
      userId,
      category,
      requestId: request.headers['x-request-id'] as string,
      endpoint: `${request.method} ${request.url || request.path}`,
    };
  }

  /**
   * 사람이 읽을 수 있는 형식으로 파일 크기 포맷팅
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return (
      Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    );
  }

  /**
   * 검증 결과를 파일 검증 에러로 매핑
   */
  mapValidationResultsToErrors(
    files: any[],
    validationResults: ValidationResult[],
  ): FileValidationError[] {
    return files.reduce((errors, file, i) => {
      const result = validationResults[i];

      if (!result.isValid) {
        errors.push({
          fileName: file.originalname,
          errorCode: result.errorCode || 'UNKNOWN_ERROR',
          errorMessage: result.errorMessage || 'Unknown validation error',
          fileSize: file.size,
          fileType: extname(file.originalname).toLowerCase(),
        });
      }

      return errors;
    }, [] as FileValidationError[]);
  }

  /**
   * 혼합 업로드 결과에 대한 부분 성공 응답 생성
   */
  createPartialSuccessResponse(
    uploadedFiles: any[],
    errors: FileValidationError[],
    requestId?: string,
  ): FileUploadErrorResponse {
    const message =
      errors.length > 0
        ? `부분 업로드 성공: ${uploadedFiles.length}개 파일 업로드됨, ${errors.length}개 실패`
        : `${uploadedFiles.length}개 파일이 성공적으로 업로드되었습니다`;

    return {
      success: false,
      message,
      errors,
      uploadedFiles,
      timestamp: new Date().toISOString(),
      requestId,
    };
  }
}
