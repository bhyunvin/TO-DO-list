import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
} from 'class-validator';

export class RequestAssistanceDto {
  @IsOptional()
  @IsNumber()
  userSeq: number; // 사용자 번호 (보통 토큰에서 추출하므로 optional 혹은 제외 가능하지만 일단 유지)

  @IsNotEmpty({ message: '요청 내용을 입력해주세요.' })
  @IsString({ message: '요청 내용은 문자열이어야 합니다.' })
  prompt: string; // 요청

  @IsOptional()
  @IsArray()
  history?: {
    role: 'user' | 'model';
    parts: { text: string }[];
  }[]; // 대화 기록

  @IsOptional()
  @IsString()
  response: string; // 응답 (보통 응답용이지만 DTO 재사용 시 유의)
}

export class ChatRequestDto {
  @IsString({ message: '메시지는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '메시지를 입력해주세요.' })
  prompt: string; // 사용자 메시지

  @IsOptional()
  @IsArray()
  history?: {
    role: 'user' | 'model';
    parts: { text: string }[];
  }[]; // 대화 기록
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
