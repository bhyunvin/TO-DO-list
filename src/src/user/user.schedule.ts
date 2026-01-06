import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { RefreshTokenEntity } from './refresh-token.entity';
import { Repository, LessThan } from 'typeorm';

@Injectable()
export class UserSchedule {
  private readonly logger = new Logger(UserSchedule.name);

  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    this.logger.debug('만료된 Refresh Token 정리 시작...');
    const now = new Date();
    const result = await this.refreshTokenRepository.delete({
      expDtm: LessThan(now),
    });
    this.logger.debug(
      `${result.affected}개의 만료된 Refresh Token이 삭제되었습니다.`,
    );
  }
}
