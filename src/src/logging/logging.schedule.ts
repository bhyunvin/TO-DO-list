import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LogEntity } from './logging.entity';
import { Repository, LessThan, Not, IsNull } from 'typeorm';
import { TodoEntity } from '../todo/todo.entity';
import { UserEntity } from '../user/user.entity';
import { FileInfoEntity } from '../fileUpload/file.entity';
import { RefreshTokenEntity } from '../user/refresh-token.entity';

@Injectable()
export class LoggingSchedule {
  private readonly logger = new Logger(LoggingSchedule.name);

  constructor(
    @InjectRepository(LogEntity)
    private readonly logRepository: Repository<LogEntity>,
    @InjectRepository(TodoEntity)
    private readonly todoRepository: Repository<TodoEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(FileInfoEntity)
    private readonly fileRepository: Repository<FileInfoEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    this.logger.debug(
      '\ub9cc\ub8cc\ub41c \ub85c\uadf8 \uc815\ub9ac \ubc0f IP \uc775\uba85\ud654 \uc2e4\ud589 \uc911...',
    );

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // 1. 로그 정리
    try {
      const result = await this.logRepository.delete({
        auditColumns: {
          regDtm: LessThan(sixMonthsAgo),
        },
      });
      this.logger.debug(`${result.affected}개의 만료된 로그가 삭제되었습니다.`);
    } catch (error) {
      this.logger.error('만료된 로그 삭제 실패', error.stack);
    }

    // 2. 비즈니스 테이블에 대한 IP 익명화
    const tables = [
      { name: 'NJ_TODO', repo: this.todoRepository },
      { name: 'NJ_USER_INFO', repo: this.userRepository },
      { name: 'NJ_FILE_INFO', repo: this.fileRepository },
      { name: 'NJ_USER_REFRESH_TOKEN', repo: this.refreshTokenRepository },
    ];

    for (const table of tables) {
      try {
        // reg_ip 익명화
        const regUpdateResult = await table.repo.update(
          {
            auditColumns: {
              regDtm: LessThan(sixMonthsAgo),
              regIp: Not(IsNull()),
            },
          },
          {
            auditColumns: {
              regIp: null,
            },
          },
        );

        // upd_ip 익명화
        const updUpdateResult = await table.repo.update(
          {
            auditColumns: {
              updDtm: LessThan(sixMonthsAgo),
              updIp: Not(IsNull()),
            },
          },
          {
            auditColumns: {
              updIp: null,
            },
          },
        );

        if (regUpdateResult.affected > 0 || updUpdateResult.affected > 0) {
          this.logger.debug(
            `${table.name}에서 IP를 null로 업데이트: reg_ip(${regUpdateResult.affected}개), upd_ip(${updUpdateResult.affected}개)`,
          );
        }
      } catch (error) {
        this.logger.error(`${table.name} 테이블의 IP 익명화 실패`, error.stack);
      }
    }
  }
}
