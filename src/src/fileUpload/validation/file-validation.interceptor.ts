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
import { FileUploadErrorService } from './file-upload-error.service';

/**
 * 보안 로깅을 포함한 서버 측 파일 검증을 위한 인터셉터
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

    // 단일 파일과 여러 파일 모두 처리
    const filesToValidate = singleFile ? [singleFile] : files;

    if (filesToValidate.length === 0) {
      return next.handle();
    }

    // 서버 측 검증 수행
    const validationResults =
      this.fileValidationService.validateFilesByCategory(
        filesToValidate,
        this.fileCategory,
      );

    // 검증 실패 확인
    const failedValidations = validationResults.filter(
      (result) => !result.isValid,
    );

    if (failedValidations.length > 0) {
      // 상세한 에러 정보 가져오기
      const validationErrors =
        this.fileUploadErrorService.mapValidationResultsToErrors(
          filesToValidate,
          validationResults,
        );

      // 로깅을 위한 오류 컨텍스트 추출
      const errorContext = this.fileUploadErrorService.extractErrorContext(
        request,
        this.fileCategory,
        request.user?.userSeq,
      );

      // 보안 이벤트 및 검증 오류 로깅
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

      // 표준화된 에러 응답 생성
      const errorResponse = this.fileUploadErrorService.createErrorResponse(
        validationErrors,
        'File validation failed',
        [],
        errorContext.requestId,
      );

      throw new BadRequestException(errorResponse);
    }

    // 성공적인 검증 로깅
    this.logger.log(
      `File validation passed for ${filesToValidate.length} file(s) in category: ${this.fileCategory}`,
    );

    return next.handle();
  }
}

/**
 * 프로필 이미지 검증 인터셉터
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
 * 할 일 첨부파일 검증 인터셉터
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
