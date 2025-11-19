import {
  Controller,
  Post,
  Body,
  Session,
  UseGuards,
  Logger,
  HttpStatus,
  Ip,
} from '@nestjs/common';
import { SessionData } from 'express-session';
import { ChatRequestDto, ChatResponseDto } from './assistance.dto';
import { AssistanceService } from './assistance.service';
import { AuthenticatedGuard } from '../../types/express/auth.guard';

@UseGuards(AuthenticatedGuard)
@Controller('assistance')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly assistanceService: AssistanceService) { }

  @Post('chat')
  async chat(
    @Session() session: SessionData,
    @Body() chatRequestDto: ChatRequestDto,
    @Ip() ip: string,
  ): Promise<ChatResponseDto> {
    const maxRetries = 3;
    const baseDelay = 1000; // 1초 기본 지연 시간

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(
          `Chat request from user ${session.user.userSeq} (attempt ${attempt}): ${chatRequestDto.prompt.substring(0, 50)}...`,
        );

        // 기존 서비스를 위한 요청 DTO 생성
        const requestDto = {
          userSeq: session.user.userSeq,
          prompt: chatRequestDto.prompt,
          history: chatRequestDto.history,
          response: '', // 서비스에서 채워질 예정
        };

        // 사용자 컨텍스트와 함께 향상된 AssistanceService 호출
        const result = await this.assistanceService.getGeminiResponse(
          requestDto,
          session.user.userSeq,
          ip,
          session.user.userName,
          session.user.userId,
        );

        // 구조화된 응답 반환
        const response: ChatResponseDto = {
          response: result.response,
          timestamp: new Date().toISOString(),
          success: true,
        };

        this.logger.log(
          `Chat response sent to user ${session.user.userSeq} on attempt ${attempt}`,
        );
        return response;
      } catch (error) {
        const isRateLimited = this.isRetryableError(error);
        const isLastAttempt = attempt === maxRetries;

        this.logger.error(
          `Chat request failed for user ${session.user.userSeq} on attempt ${attempt}:`,
          {
            error: error.message,
            status: error.response?.status || error.status,
            isRateLimited,
            isLastAttempt,
          },
        );

        // 속도 제한 오류이고 마지막 시도가 아닌 경우, 대기 후 재시도
        if (isRateLimited && !isLastAttempt) {
          const delay = this.calculateRetryDelay(attempt, baseDelay, error);
          this.logger.log(
            `Rate limited. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
          );
          await this.sleep(delay);
          continue;
        }

        // 마지막 시도이거나 재시도 불가능한 오류인 경우, 오류 응답 반환
        return {
          response: '',
          timestamp: new Date().toISOString(),
          success: false,
          error: this.getKoreanErrorMessage(error, attempt, maxRetries),
        };
      }
    }
  }

  private isRetryableError(error: any): boolean {
    const status = error.response?.status || error.status;
    return (
      status === HttpStatus.TOO_MANY_REQUESTS ||
      status === 429 ||
      status === HttpStatus.SERVICE_UNAVAILABLE ||
      status === 503
    );
  }

  private calculateRetryDelay(
    attempt: number,
    baseDelay: number,
    error: any,
  ): number {
    // API가 Retry-After 헤더를 제공하는지 확인
    const retryAfter = error.response?.headers?.['retry-after'];
    if (retryAfter) {
      const retryAfterMs = parseInt(retryAfter) * 1000; // 초를 밀리초로 변환
      return Math.min(retryAfterMs, 30000); // 최대 30초로 제한
    }

    // 지수 백오프: baseDelay * (2^(attempt-1)) + 지터
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000; // 최대 1초의 지터 추가
    return Math.min(exponentialDelay + jitter, 30000); // 최대 30초로 제한
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getKoreanErrorMessage(
    error: any,
    attempt?: number,
    maxRetries?: number,
  ): string {
    const status = error.response?.status || error.status;

    // 인증 오류
    if (status === 401) {
      return '로그인이 필요합니다.';
    }

    // 속도 제한 오류
    if (status === 429 || status === HttpStatus.TOO_MANY_REQUESTS) {
      if (attempt && maxRetries && attempt >= maxRetries) {
        return 'AI 서비스가 현재 과부하 상태입니다. 잠시 후 다시 시도해주세요.';
      }
      return 'AI 서비스 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
    }

    // API 할당량 초과 (속도 제한과 다름)
    if (status === 403 && error.message?.includes('quota')) {
      return 'AI 서비스 사용량이 한도를 초과했습니다. 관리자에게 문의해주세요.';
    }

    // 서버 오류
    if (status >= 500) {
      return 'AI 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }

    // 네트워크 오류
    if (
      error.message?.includes('network') ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT'
    ) {
      return '네트워크 연결을 확인해주세요.';
    }

    // API 요청 실패 (일반 API 오류)
    if (error.message?.includes('API request failed')) {
      return 'AI 서비스 요청이 실패했습니다. 잠시 후 다시 시도해주세요.';
    }

    // 일반 오류 메시지
    return '문제가 발생했습니다. 다시 시도해주세요.';
  }
}
