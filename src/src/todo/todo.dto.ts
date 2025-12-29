export class CreateTodoDto {
  todoContent: string; // 할 일 내용
  todoDate: string; // 할 일 날짜
  todoNote?: string; // 비고 (선택 사항)
}

export class CreateTodoWithFilesDto extends CreateTodoDto {
  // 파일은 multipart/form-data로 별도 처리되므로 DTO에는 포함하지 않음
}

export class UpdateTodoDto {
  todoContent?: string; // 할 일 내용 (선택 사항)
  completeDtm?: string; // 완료 일시 (선택 사항)
  todoNote?: string; // 비고 (선택 사항)
}

export class DeleteTodoDto {
  todoIds: number[];
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
