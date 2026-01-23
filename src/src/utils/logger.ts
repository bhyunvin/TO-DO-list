/**
 * Bun & ElysiaJS 환경을 위한 표준 Logger 유틸리티
 * NestJS Logger와 유사한 인터페이스를 제공합니다.
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
    this.printLog('INFO', message, context || this.context);
  }

  /**
   * 에러 로그 (ERROR)
   */
  error(message: string, trace?: string, context?: string) {
    this.printLog('ERROR', message, context || this.context);
    if (trace) {
      console.error(trace);
    }
  }

  /**
   * 경고 로그 (WARN)
   */
  warn(message: string, context?: string) {
    this.printLog('WARN', message, context || this.context);
  }

  /**
   * 디버그 로그 (DEBUG)
   */
  debug(message: string, context?: string) {
    this.printLog('DEBUG', message, context || this.context);
  }

  /**
   * 상세 로그 (VERBOSE)
   */
  verbose(message: string, context?: string) {
    this.printLog('VERBOSE', message, context || this.context);
  }

  /**
   * 전역 컨텍스트 설정
   */
  setContext(context: string) {
    this.context = context;
  }

  private printLog(level: string, message: string, context?: string) {
    const timestamp = new Date().toISOString();
    const contextMsg = context ? ` [${context}]` : '';
    const formattedMessage = `[${timestamp}] ${level}${contextMsg} ${message}`;

    switch (level) {
      case 'ERROR':
        console.error(formattedMessage);
        break;
      case 'WARN':
        console.warn(formattedMessage);
        break;
      case 'DEBUG':
        console.debug(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
        break;
    }
  }
}
