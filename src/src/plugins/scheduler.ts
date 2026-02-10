import { Elysia } from 'elysia';
import { cron } from '@elysiajs/cron';
import { dataSource } from './database';
import { LoggingScheduler } from '../features/logging/logging.scheduler';
import { Logger } from '../utils/logger';

const logger = new Logger('Scheduler');

/**
 * 스케줄러 플러그인
 * - 로그 정리 cron job 등록
 * - 서버 시작 시 초기 실행
 */
export const schedulerPlugin = new Elysia({ name: 'scheduler' })
  .use(
    cron({
      name: 'log-cleanup',
      pattern: '0 0 * * *', // 매일 자정에 실행
      async run() {
        const loggingScheduler = new LoggingScheduler(dataSource);
        await loggingScheduler.cleanupOldLogsAndAnonymizeIp();
      },
    }),
  )
  .onStart(() => {
    // 서버 시작 5초 후에 초기 로그 정리 실행
    setTimeout(() => {
      new LoggingScheduler(dataSource).cleanupOldLogsAndAnonymizeIp();
    }, 5000);
    logger.log('📅 로그 스케줄러가 등록되었습니다.');
  });
