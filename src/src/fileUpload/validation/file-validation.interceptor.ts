import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { FileValidationService } from './file-validation.service';
import { FileCategory } from './file-validation.interfaces';
import { FILE_VALIDATION_ERRORS } from './file-validation.constants';

/**
 * Interceptor for server-side file validation with security logging
 */
@Injectable()
export class FileValidationInterceptor implements NestInterceptor {
  protected readonly logger = new Logger(FileValidationInterceptor.name);

  constructor(
    protected readonly fileValidationService: FileValidationService,
    protected readonly fileCategory: FileCategory,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const files: Express.Multer.File[] = request.files || [];
    const singleFile: Express.Multer.File = request.file;

    // Handle both single file and multiple files
    const filesToValidate = singleFile ? [singleFile] : files;

    if (filesToValidate.length === 0) {
      return next.handle();
    }

    // Perform server-side validation
    const validationResults = this.fileValidationService.validateFilesByCategory(
      filesToValidate,
      this.fileCategory,
    );

    // Check for validation failures
    const failedValidations = validationResults.filter(result => !result.isValid);

    if (failedValidations.length > 0) {
      // Log security events for blocked files
      this.logSecurityEvents(filesToValidate, failedValidations, request);

      // Get detailed error information
      const validationErrors = this.fileValidationService.getValidationErrors(
        filesToValidate,
        validationResults,
      );

      // Throw descriptive error
      const errorMessage = this.formatValidationErrorMessage(validationErrors);
      throw new BadRequestException({
        message: 'File validation failed',
        errors: validationErrors,
        details: errorMessage,
      });
    }

    // Log successful validation
    this.logger.log(
      `File validation passed for ${filesToValidate.length} file(s) in category: ${this.fileCategory}`,
    );

    return next.handle();
  }

  /**
   * Log security events for blocked file attempts
   */
  protected logSecurityEvents(
    files: Express.Multer.File[],
    failedValidations: any[],
    request: any,
  ): void {
    const clientIp = request.ip || request.connection.remoteAddress;
    const userAgent = request.get('User-Agent') || 'Unknown';

    failedValidations.forEach((validation, index) => {
      const file = files[index];
      
      if (validation.errorCode === FILE_VALIDATION_ERRORS.BLOCKED_FILE_TYPE) {
        this.logger.warn(
          `SECURITY ALERT: Blocked file type upload attempt - ` +
          `File: ${file.originalname}, ` +
          `Size: ${file.size} bytes, ` +
          `IP: ${clientIp}, ` +
          `User-Agent: ${userAgent}, ` +
          `Category: ${this.fileCategory}`,
        );
      } else {
        this.logger.warn(
          `File validation failed - ` +
          `File: ${file.originalname}, ` +
          `Error: ${validation.errorCode}, ` +
          `Size: ${file.size} bytes, ` +
          `IP: ${clientIp}, ` +
          `Category: ${this.fileCategory}`,
        );
      }
    });
  }

  /**
   * Format validation error messages for user-friendly display
   */
  protected formatValidationErrorMessage(errors: any[]): string {
    if (errors.length === 1) {
      return `File "${errors[0].fileName}": ${errors[0].errorMessage}`;
    }

    const errorSummary = errors.map(error => 
      `"${error.fileName}": ${error.errorMessage}`
    ).join('; ');

    return `Multiple file validation errors: ${errorSummary}`;
  }
}



/**
 * Profile image validation interceptor
 */
@Injectable()
export class ProfileImageValidationInterceptor extends FileValidationInterceptor {
  constructor(fileValidationService: FileValidationService) {
    super(fileValidationService, 'profile_image');
  }
}

/**
 * TODO attachment validation interceptor
 */
@Injectable()
export class TodoAttachmentValidationInterceptor extends FileValidationInterceptor {
  constructor(fileValidationService: FileValidationService) {
    super(fileValidationService, 'todo_attachment');
  }
}