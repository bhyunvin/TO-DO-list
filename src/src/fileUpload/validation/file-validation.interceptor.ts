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
import { FileUploadErrorService } from './file-upload-error.service';

/**
 * Interceptor for server-side file validation with security logging
 */
@Injectable()
export class FileValidationInterceptor implements NestInterceptor {
  protected readonly logger = new Logger(FileValidationInterceptor.name);

  constructor(
    protected readonly fileValidationService: FileValidationService,
    protected readonly fileUploadErrorService: FileUploadErrorService,
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
    const validationResults =
      this.fileValidationService.validateFilesByCategory(
        filesToValidate,
        this.fileCategory,
      );

    // Check for validation failures
    const failedValidations = validationResults.filter(
      (result) => !result.isValid,
    );

    if (failedValidations.length > 0) {
      // Get detailed error information
      const validationErrors =
        this.fileUploadErrorService.mapValidationResultsToErrors(
          filesToValidate,
          validationResults,
        );

      // Extract error context for logging
      const errorContext = this.fileUploadErrorService.extractErrorContext(
        request,
        this.fileCategory,
        request.user?.userSeq,
      );

      // Log security events and validation errors
      this.fileUploadErrorService.logSecurityEvent(
        filesToValidate,
        validationErrors,
        errorContext,
      );
      this.fileUploadErrorService.logValidationErrors(
        filesToValidate,
        validationErrors,
        errorContext,
      );

      // Create standardized error response
      const errorResponse = this.fileUploadErrorService.createErrorResponse(
        validationErrors,
        'File validation failed',
        [],
        errorContext.requestId,
      );

      throw new BadRequestException(errorResponse);
    }

    // Log successful validation
    this.logger.log(
      `File validation passed for ${filesToValidate.length} file(s) in category: ${this.fileCategory}`,
    );

    return next.handle();
  }
}

/**
 * Profile image validation interceptor
 */
@Injectable()
export class ProfileImageValidationInterceptor extends FileValidationInterceptor {
  constructor(
    fileValidationService: FileValidationService,
    fileUploadErrorService: FileUploadErrorService,
  ) {
    super(fileValidationService, fileUploadErrorService, 'profile_image');
  }
}

/**
 * TODO attachment validation interceptor
 */
@Injectable()
export class TodoAttachmentValidationInterceptor extends FileValidationInterceptor {
  constructor(
    fileValidationService: FileValidationService,
    fileUploadErrorService: FileUploadErrorService,
  ) {
    super(fileValidationService, fileUploadErrorService, 'todo_attachment');
  }
}
