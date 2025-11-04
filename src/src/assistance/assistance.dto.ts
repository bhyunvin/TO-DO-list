import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class RequestAssistanceDto {
  userSeq: number; // 사용자번호

  prompt: string; // 요청

  response: string; // 응답
}

export class ChatRequestDto {
  @IsString()
  @IsNotEmpty()
  prompt: string; // 사용자 메시지
}

export class ChatResponseDto {
  response: string; // AI 응답 (HTML 형식)
  timestamp: string; // 응답 시간
  success: boolean; // 성공 여부
  
  @IsOptional()
  error?: string; // 오류 메시지 (실패 시)
}

export class TodoSummaryDto {
  todoSeq: number; // 할 일 번호
  todoContent: string; // 할 일 내용
  todoDate: string; // 할 일 날짜
  completeDtm: string | null; // 완료 시간
  isOverdue: boolean; // 지연 여부
}
