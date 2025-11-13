// ToDo 항목 생성을 위한 DTO (Data Transfer Object)
export class CreateTodoDto {
  todoContent: string; // 할 일 내용

  todoDate: string; // 할 일 날짜

  todoNote?: string; // 비고 (선택 사항)
}

// 파일과 함께 ToDo 항목 생성을 위한 DTO
export class CreateTodoWithFilesDto extends CreateTodoDto {
  // 파일은 multipart/form-data로 별도 처리되므로 DTO에는 포함하지 않음
}

// ToDo 항목 수정을 위한 DTO
export class UpdateTodoDto {
  todoContent?: string; // 할 일 내용 (선택 사항)

  completeDtm?: string; // 완료 일시 (선택 사항)

  todoNote?: string; // 비고 (선택 사항)
}

// ToDo 항목 삭제를 위한 DTO
export class DeleteTodoDto {
  todoIds: number[]; // 삭제할 ToDo 항목들의 ID 배열
}

// 파일 첨부 응답 DTO
export class FileAttachmentResponseDto {
  fileNo: number;
  originalFileName: string;
  fileSize: number;
  fileExt: string;
  uploadDate: string;
  validationStatus: string;
}

// TODO 생성 응답 DTO (파일 포함)
export class TodoWithFilesResponseDto {
  todoSeq: number;
  todoContent: string;
  todoDate: string;
  todoNote?: string;
  completeDtm?: string;
  attachments: FileAttachmentResponseDto[];
  createdAt: string;
}

// 파일 업로드 응답 DTO
export class FileUploadResponseDto {
  success: boolean;
  uploadedFiles: FileAttachmentResponseDto[];
  fileGroupNo?: number;
  message: string;
}

// 파일 검증 오류 DTO
export class FileValidationErrorDto {
  fileName: string;
  errorCode: string;
  errorMessage: string;
  fileSize?: number;
  fileType?: string;
}

// 파일 업로드 오류 응답 DTO
export class FileUploadErrorResponseDto {
  success: false;
  errors: FileValidationErrorDto[];
  uploadedFiles?: FileAttachmentResponseDto[];
  message: string;
}
