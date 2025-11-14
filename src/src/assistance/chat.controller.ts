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

  constructor(private readonly assistanceService: AssistanceService) {}

  @Post('chat')
  async chat(
    @Session() session: SessionData,
    @Body() chatRequestDto: ChatRequestDto,
    @Ip() ip: string,
  ): Promise<ChatResponseDto> {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second base delay

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(
          `Chat request from user ${session.user.userSeq} (attempt ${attempt}): ${chatRequestDto.prompt.substring(0, 50)}...`,
        );

        // Create request DTO for the existing service
        const requestDto = {
          userSeq: session.user.userSeq,
          prompt: chatRequestDto.prompt,
          response: '', // Will be filled by the service
        };

        // Call the enhanced AssistanceService with user context
        const result = await this.assistanceService.getGeminiResponse(
          requestDto,
          session.user.userSeq,
          ip,
          session.user.userName,
          session.user.userId,
        );

        // Return structured response
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
        const isRateLimited = this.isRateLimitError(error);
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

        // If it's a rate limit error and not the last attempt, wait and retry
        if (isRateLimited && !isLastAttempt) {
          const delay = this.calculateRetryDelay(attempt, baseDelay, error);
          this.logger.log(
            `Rate limited. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
          );
          await this.sleep(delay);
          continue;
        }

        // If it's the last attempt or not a retryable error, return error response
        const errorResponse: ChatResponseDto = {
          response: '',
          timestamp: new Date().toISOString(),
          success: false,
          error: this.getKoreanErrorMessage(error, attempt, maxRetries),
        };

        return errorResponse;
      }
    }
  }

  private isRateLimitError(error: any): boolean {
    const status = error.response?.status || error.status;
    return status === HttpStatus.TOO_MANY_REQUESTS || status === 429;
  }

  private calculateRetryDelay(
    attempt: number,
    baseDelay: number,
    error: any,
  ): number {
    // Check if the API provides a Retry-After header
    const retryAfter = error.response?.headers?.['retry-after'];
    if (retryAfter) {
      const retryAfterMs = parseInt(retryAfter) * 1000; // Convert seconds to milliseconds
      return Math.min(retryAfterMs, 30000); // Cap at 30 seconds
    }

    // Exponential backoff: baseDelay * (2^(attempt-1)) with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
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

    // Authentication errors
    if (status === 401) {
      return '로그인이 필요합니다.';
    }

    // Rate limiting errors
    if (status === 429 || status === HttpStatus.TOO_MANY_REQUESTS) {
      if (attempt && maxRetries && attempt >= maxRetries) {
        return 'AI 서비스가 현재 과부하 상태입니다. 잠시 후 다시 시도해주세요.';
      }
      return 'AI 서비스 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
    }

    // API quota exceeded (different from rate limiting)
    if (status === 403 && error.message?.includes('quota')) {
      return 'AI 서비스 사용량이 한도를 초과했습니다. 관리자에게 문의해주세요.';
    }

    // Server errors
    if (status >= 500) {
      return 'AI 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }

    // Network errors
    if (
      error.message?.includes('network') ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT'
    ) {
      return '네트워크 연결을 확인해주세요.';
    }

    // API request failed (generic API error)
    if (error.message?.includes('API request failed')) {
      return 'AI 서비스 요청이 실패했습니다. 잠시 후 다시 시도해주세요.';
    }

    // Generic error message
    return '문제가 발생했습니다. 다시 시도해주세요.';
  }
}
