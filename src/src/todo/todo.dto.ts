import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsDateString,
  IsArray,
  IsNumber,
} from 'class-validator';

export class CreateTodoDto {
  @IsNotEmpty({ message: '할 일 내용을 입력해주세요.' })
  @IsString({ message: '할 일 내용은 문자열이어야 합니다.' })
  todoContent: string; // 할 일 내용

  @IsNotEmpty({ message: '날짜를 입력해주세요.' })
  @IsDateString({}, { message: '올바른 날짜 형식이 아닙니다.' })
  todoDate: string; // 할 일 날짜

  @IsOptional()
  @IsString({ message: '비고는 문자열이어야 합니다.' })
  todoNote?: string; // 비고 (선택 사항)
}

export class CreateTodoWithFilesDto extends CreateTodoDto {
  // 파일은 multipart/form-data로 별도 처리되므로 DTO에는 포함하지 않음
}

export class UpdateTodoDto {
  @IsOptional()
  @IsString({ message: '할 일 내용은 문자열이어야 합니다.' })
  todoContent?: string; // 할 일 내용 (선택 사항)

  @IsOptional()
  @IsDateString({}, { message: '올바른 날짜 형식이 아닙니다.' })
  completeDtm?: string; // 완료 일시 (선택 사항)

  @IsOptional()
  @IsString({ message: '비고는 문자열이어야 합니다.' })
  todoNote?: string; // 비고 (선택 사항)
}

export class UpdateTodoWithFilesDto extends UpdateTodoDto {
  // 파일은 multipart/form-data로 별도 처리되므로 DTO에는 포함하지 않음
}

export class DeleteTodoDto {
  @IsArray({ message: '삭제할 할 일 ID 목록은 배열이어야 합니다.' })
  @IsNumber({}, { each: true, message: '할 일 ID는 숫자이어야 합니다.' })
  todoIds: number[];
}

export class SearchTodoDto {
  @IsString()
  startDate: string;

  @IsString()
  endDate: string;

  @IsOptional()
  @IsString()
  keyword?: string;
}

export class FileAttachmentResponseDto {
  fileNo: number;
  originalFileName: string;
  fileSize: number;
  fileExt: string;
  uploadDate: string;
}

export class TodoWithFilesResponseDto {
  todoSeq: number;
  todoContent: string;
  todoDate: string;
  todoNote?: string;
  completeDtm?: string;
  attachments: FileAttachmentResponseDto[];
  createdAt: string;
}

export class FileUploadResponseDto {
  success: boolean;
  uploadedFiles: FileAttachmentResponseDto[];
  fileGroupNo?: number;
  message: string;
}

export class FileValidationErrorDto {
  fileName: string;
  errorCode: string;
  errorMessage: string;
  fileSize?: number;
  fileType?: string;
}

export class FileUploadErrorResponseDto {
  success: false;
  errors: FileValidationErrorDto[];
  uploadedFiles?: FileAttachmentResponseDto[];
  message: string;
}
