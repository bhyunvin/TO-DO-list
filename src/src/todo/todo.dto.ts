// ToDo 항목 생성을 위한 DTO (Data Transfer Object)
export class CreateTodoDto {
  todoContent: string; // 할 일 내용

  todoDate: string; // 할 일 날짜

  todoNote?: string; // 비고 (선택 사항)
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
