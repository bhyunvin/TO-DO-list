/**
 * 통합 Pino Logger 인스턴스
 *
 * 애플리케이션 전체에서 사용할 단일 pino 인스턴스를 생성하고 내보냅니다.
 * 이를 통해 HTTP 로그와 애플리케이션 로그의 형식을 일치시킵니다.
 */
import pino from 'pino';

/**
 * 전역 pino 인스턴스
 * - colorize: 터미널에서 로그 색상 출력
 * - translateTime: 타임스탬프를 시스템 표준 형식으로 변환
 * - ignore: 불필요한 pid, hostname 필드 제거
 */
export const pinoLogger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});
