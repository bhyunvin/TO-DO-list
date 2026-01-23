/**
 * Bun & ElysiaJS 환경을 위한 표준 Logger 유틸리티
 * NestJS Logger와 유사한 인터페이스를 제공합니다.
 */
import pino from 'pino';

/**
 * Bun & ElysiaJS 환경을 위한 표준 Logger 유틸리티
 * NestJS Logger와 유사한 인터페이스를 제공하지만, 내부는 pino를 사용합니다.
 */
export class Logger {
  // 전역 pino 인스턴스 (싱글톤 패턴 유사)
  private static readonly pinoLogger = pino({
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  });

  private context?: string;

  constructor(context?: string) {
    this.context = context;
  }

  /**
   * 일반 로그 (INFO)
   */
  log(message: string, context?: string) {
    Logger.pinoLogger.info({ context: context || this.context }, message);
  }

  /**
   * 에러 로그 (ERROR)
   */
  error(message: string, trace?: string, context?: string) {
    Logger.pinoLogger.error(
      { context: context || this.context, err: trace },
      message,
    );
  }

  /**
   * 경고 로그 (WARN)
   */
  warn(message: string, context?: string) {
    Logger.pinoLogger.warn({ context: context || this.context }, message);
  }

  /**
   * 디버그 로그 (DEBUG)
   */
  debug(message: string, context?: string) {
    Logger.pinoLogger.debug({ context: context || this.context }, message);
  }

  /**
   * 상세 로그 (VERBOSE) - pino에서는 trace 레벨에 대응
   */
  verbose(message: string, context?: string) {
    Logger.pinoLogger.trace({ context: context || this.context }, message);
  }

  /**
   * 전역 컨텍스트 설정
   */
  setContext(context: string) {
    this.context = context;
  }
}
