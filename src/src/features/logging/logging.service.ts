import { Repository } from 'typeorm';
import { LogEntity } from './log.entity';
import { Logger } from '../../utils/logger';

export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);

  constructor(private readonly logRepository: Repository<LogEntity>) {}

  /**
   * 로그 비동기 저장 (Fire-and-forget을 위해 Promise 반환하되 await 강제 안 함)
   */
  async log(data: Partial<LogEntity>): Promise<void> {
    try {
      const log = this.logRepository.create(data);
      await this.logRepository.save(log);
    } catch (error: unknown) {
      let errorMessage: string;
      let errorStack: string | undefined;

      if (error instanceof Error) {
        errorMessage = error.message;
        errorStack = error.stack;
      } else {
        try {
          errorMessage = JSON.stringify(error);
        } catch {
          errorMessage = 'Unknown error (JSON stringify failed)';
        }
      }

      this.logger.error('Failed to save DB log', errorStack || errorMessage);
      // DB 로깅 실패가 메인 로직에 영향을 주지 않도록 예외 무시
    }
  }
}
