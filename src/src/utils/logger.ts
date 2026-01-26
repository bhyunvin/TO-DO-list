/**
 * Bun & ElysiaJS 환경을 위한 표준 Logger 유틸리티
 * NestJS Logger와 유사한 인터페이스를 제공합니다.
 */
import { pinoLogger } from './pino';

/**
 * Bun & ElysiaJS 환경을 위한 표준 Logger 유틸리티
 * NestJS Logger와 유사한 인터페이스를 제공하지만, 내부는 pino를 사용합니다.
 *
 * 전역 공유 pino 인스턴스(pino.ts)를 사용하여
 * HTTP 로그와 애플리케이션 로그의 형식을 일치시킵니다.
 */
export class Logger {
  private context?: string;

  constructor(context?: string) {
    this.context = context;
  }

  /**
   * 일반 로그 (INFO)
   */
  log(message: string, context?: string) {
    pinoLogger.info({ context: context || this.context }, message);
  }

  /**
   * 에러 로그 (ERROR)
   */
  error(message: string, trace?: string, context?: string) {
    pinoLogger.error({ context: context || this.context, err: trace }, message);
  }

  /**
   * 경고 로그 (WARN)
   */
  warn(message: string, context?: string) {
    pinoLogger.warn({ context: context || this.context }, message);
  }

  /**
   * 디버그 로그 (DEBUG)
   */
  debug(message: string, context?: string) {
    pinoLogger.debug({ context: context || this.context }, message);
  }

  /**
   * 상세 로그 (VERBOSE) - pino에서는 trace 레벨에 대응
   */
  verbose(message: string, context?: string) {
    pinoLogger.trace({ context: context || this.context }, message);
  }

  /**
   * 전역 컨텍스트 설정
   */
  setContext(context: string) {
    this.context = context;
  }
}
