import { DataSource, DeepPartial } from 'typeorm';
import { LogEntity } from './log.entity';
import { TodoEntity } from '../todo/todo.entity';
import { UserEntity } from '../user/user.entity';
import { FileInfoEntity } from '../../fileUpload/file.entity';
import { RefreshTokenEntity } from '../user/refresh-token.entity';
import { Logger } from '../../utils/logger';

export class LoggingScheduler {
  private readonly logger = new Logger('LoggingScheduler');

  constructor(private readonly dataSource: DataSource) {}

  /**
   * 6개월 이상 로그 삭제 및 IP 익명화
   * - 로그: 6개월 이상 된 로그 완전 삭제
   * - IP 익명화: 6개월 이상 된 레코드의 IP 주소를 null로 변경
   */
  async cleanupOldLogsAndAnonymizeIp() {
    this.logger.log('만료된 로그 정리 및 IP 익명화 실행 중...');

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const logRepo = this.dataSource.getRepository(LogEntity);
    const todoRepo = this.dataSource.getRepository(TodoEntity);
    const userRepo = this.dataSource.getRepository(UserEntity);
    const fileRepo = this.dataSource.getRepository(FileInfoEntity);
    const refreshTokenRepo = this.dataSource.getRepository(RefreshTokenEntity);

    // 1. 로그 정리 (6개월 이상)
    try {
      const result = await logRepo
        .createQueryBuilder()
        .delete()
        .where('auditColumns.regDtm < :date', { date: sixMonthsAgo })
        .execute();

      this.logger.log(
        `${result.affected || 0}개의 만료된 로그가 삭제되었습니다.`,
      );
    } catch (error) {
      this.logger.error('만료된 로그 삭제 실패', error);
    }

    // 2. IP 익명화 (각 테이블)
    const tables = [
      { name: 'NJ_TODO', repo: todoRepo },
      { name: 'NJ_USER_INFO', repo: userRepo },
      { name: 'NJ_FILE_INFO', repo: fileRepo },
      { name: 'NJ_USER_REFRESH_TOKEN', repo: refreshTokenRepo },
    ];

    for (const table of tables) {
      try {
        // reg_ip 익명화
        const regResult = await table.repo
          .createQueryBuilder()
          .update()
          .set({ auditColumns: { regIp: null } } as DeepPartial<any>) // DeepPartial 사용
          .where('auditColumns.regDtm < :date', { date: sixMonthsAgo })
          .andWhere('auditColumns.regIp IS NOT NULL')
          .execute();

        // upd_ip 익명화
        const updResult = await table.repo
          .createQueryBuilder()
          .update()
          .set({ auditColumns: { updIp: null } } as DeepPartial<any>)
          .where('auditColumns.updDtm < :date', { date: sixMonthsAgo })
          .andWhere('auditColumns.updIp IS NOT NULL')
          .execute();

        if ((regResult.affected || 0) > 0 || (updResult.affected || 0) > 0) {
          this.logger.log(
            `${table.name}에서 IP를 null로 업데이트: reg_ip(${regResult.affected || 0}개), upd_ip(${updResult.affected || 0}개)`,
          );
        }
      } catch (error) {
        this.logger.error(`${table.name} 테이블의 IP 익명화 실패`, error);
      }
    }

    this.logger.log('로그 정리 및 IP 익명화 완료.');
  }
}
