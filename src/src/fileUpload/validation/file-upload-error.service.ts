import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { extname } from 'path';
import {
  FileValidationError,
  ValidationResult,
  FileCategory,
} from './file-validation.interfaces';
import {
  FILE_VALIDATION_ERRORS,
  FILE_VALIDATION_MESSAGES,
} from './file-validation.constants';

/**
 * Standardized error response format for file uploads
 */
export interface FileUploadErrorResponse {
  success: false;
  message: string;
  errors: FileValidationError[];
  uploadedFiles?: any[];
  timestamp: string;
  requestId?: string;
}

/**
 * Success response format for file uploads
 */
export interface FileUploadSuccessResponse {
  success: true;
  message: string;
  uploadedFiles: any[];
  timestamp: string;
  requestId?: string;
}

/**
 * Error logging context for security and debugging
 */
export interface ErrorLogContext {
  clientIp: string;
  userAgent: string;
  userId?: number;
  category: FileCategory;
  requestId?: string;
  endpoint: string;
}

/**
 * Service for handling file upload errors with standardized responses and logging
 */
@Injectable()
export class FileUploadErrorService {
  private readonly logger = new Logger(FileUploadErrorService.name);

  /**
   * Create standardized error response for file upload failures
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
   * Create standardized success response for file uploads
   */
  createSuccessResponse(
    uploadedFiles: any[],
    message?: string,
    requestId?: string,
  ): FileUploadSuccessResponse {
    return {
      success: true,
      message:
        message || `Successfully uploaded ${uploadedFiles.length} file(s)`,
      uploadedFiles,
      timestamp: new Date().toISOString(),
      requestId,
    };
  }

  /**
   * Generate user-friendly error message from validation errors
   */
  generateErrorMessage(errors: FileValidationError[]): string {
    if (errors.length === 0) {
      return 'File upload failed';
    }

    if (errors.length === 1) {
      const error = errors[0];
      return `File "${error.fileName}": ${this.getUserFriendlyMessage(error)}`;
    }

    // Multiple errors - group by error type
    const errorGroups = this.groupErrorsByType(errors);
    const messages: string[] = [];

    for (const [errorCode, fileErrors] of Object.entries(errorGroups)) {
      if (fileErrors.length === 1) {
        messages.push(
          `"${fileErrors[0].fileName}": ${this.getUserFriendlyMessage(fileErrors[0])}`,
        );
      } else {
        const fileNames = fileErrors.map((e) => `"${e.fileName}"`).join(', ');
        messages.push(
          `${fileNames}: ${this.getUserFriendlyMessage(fileErrors[0])}`,
        );
      }
    }

    return messages.join('; ');
  }

  /**
   * Get user-friendly error message with additional context
   */
  getUserFriendlyMessage(error: FileValidationError): string {
    const baseMessage =
      FILE_VALIDATION_MESSAGES[error.errorCode] || error.errorMessage;

    switch (error.errorCode) {
      case FILE_VALIDATION_ERRORS.FILE_TOO_LARGE:
        const sizeInfo = error.fileSize
          ? ` (${this.formatFileSize(error.fileSize)})`
          : '';
        return `${baseMessage}${sizeInfo}`;

      case FILE_VALIDATION_ERRORS.INVALID_FILE_TYPE:
      case FILE_VALIDATION_ERRORS.BLOCKED_FILE_TYPE:
        const typeInfo = error.fileType ? ` (${error.fileType})` : '';
        return `${baseMessage}${typeInfo}`;

      default:
        return baseMessage;
    }
  }

  /**
   * Group errors by error code for better message formatting
   */
  private groupErrorsByType(
    errors: FileValidationError[],
  ): Record<string, FileValidationError[]> {
    return errors.reduce(
      (groups, error) => {
        const key = error.errorCode;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(error);
        return groups;
      },
      {} as Record<string, FileValidationError[]>,
    );
  }

  /**
   * Log security events for blocked file attempts
   */
  logSecurityEvent(
    files: Express.Multer.File[],
    errors: FileValidationError[],
    context: ErrorLogContext,
  ): void {
    const securityErrors = errors.filter(
      (error) => error.errorCode === FILE_VALIDATION_ERRORS.BLOCKED_FILE_TYPE,
    );

    if (securityErrors.length === 0) {
      return;
    }

    securityErrors.forEach((error) => {
      const file = files.find((f) => f.originalname === error.fileName);

      this.logger.warn(`SECURITY ALERT: Blocked file type upload attempt`, {
        fileName: error.fileName,
        fileType: error.fileType,
        fileSize: error.fileSize,
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

  /**
   * Log validation errors for debugging
   */
  logValidationErrors(
    files: Express.Multer.File[],
    errors: FileValidationError[],
    context: ErrorLogContext,
  ): void {
    const nonSecurityErrors = errors.filter(
      (error) => error.errorCode !== FILE_VALIDATION_ERRORS.BLOCKED_FILE_TYPE,
    );

    if (nonSecurityErrors.length === 0) {
      return;
    }

    this.logger.warn(
      `File validation failed for ${nonSecurityErrors.length} file(s)`,
      {
        errors: nonSecurityErrors.map((error) => ({
          fileName: error.fileName,
          errorCode: error.errorCode,
          fileSize: error.fileSize,
          fileType: error.fileType,
        })),
        clientIp: context.clientIp,
        userAgent: context.userAgent,
        userId: context.userId,
        category: context.category,
        endpoint: context.endpoint,
        requestId: context.requestId,
        timestamp: new Date().toISOString(),
      },
    );
  }

  /**
   * Log successful file uploads
   */
  logSuccessfulUpload(uploadedFiles: any[], context: ErrorLogContext): void {
    this.logger.log(`Successfully uploaded ${uploadedFiles.length} file(s)`, {
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
    });
  }

  /**
   * Extract error logging context from request
   */
  extractErrorContext(
    request: Request,
    category: FileCategory,
    userId?: number,
  ): ErrorLogContext {
    return {
      clientIp: request.ip || request.connection?.remoteAddress || 'unknown',
      userAgent: request.get('User-Agent') || 'unknown',
      userId,
      category,
      requestId: request.headers['x-request-id'] as string,
      endpoint: `${request.method} ${request.path}`,
    };
  }

  /**
   * Format file size in human-readable format
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Map validation results to file validation errors
   */
  mapValidationResultsToErrors(
    files: Express.Multer.File[],
    validationResults: ValidationResult[],
  ): FileValidationError[] {
    const errors: FileValidationError[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = validationResults[i];

      if (!result.isValid) {
        errors.push({
          fileName: file.originalname,
          errorCode: result.errorCode!,
          errorMessage: result.errorMessage!,
          fileSize: file.size,
          fileType: extname(file.originalname).toLowerCase(),
        });
      }
    }

    return errors;
  }

  /**
   * Create partial success response for mixed upload results
   */
  createPartialSuccessResponse(
    uploadedFiles: any[],
    errors: FileValidationError[],
    requestId?: string,
  ): FileUploadErrorResponse {
    const message =
      errors.length > 0
        ? `Partial upload success: ${uploadedFiles.length} file(s) uploaded, ${errors.length} failed`
        : `Successfully uploaded ${uploadedFiles.length} file(s)`;

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
