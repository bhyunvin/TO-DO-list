import { IsString, IsOptional, IsDateString, IsNumber } from 'class-validator';

// ToDo 항목 생성을 위한 DTO (Data Transfer Object)
export class CreateTodoDto {
  @IsString()
  todoContent: string; // 할 일 내용

  @IsDateString()
  todoDate: string; // 할 일 날짜

  @IsString()
  @IsOptional()
  todoNote?: string; // 비고 (선택 사항)
}

// ToDo 항목 수정을 위한 DTO
export class UpdateTodoDto {
  @IsString()
  @IsOptional()
  todoContent?: string; // 할 일 내용 (선택 사항)

  @IsString()
  @IsOptional()
  completeDtm?: string; // 완료 일시 (선택 사항)

  @IsString()
  @IsOptional()
  todoNote?: string; // 비고 (선택 사항)
}

// ToDo 항목 삭제를 위한 DTO
export class DeleteTodoDto {
    @IsNumber({}, { each: true })
    todoIds: number[]; // 삭제할 ToDo 항목들의 ID 배열
}
