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
    this.logger.debug('Running expired refresh token cleanup...');
    const now = new Date();
    const result = await this.refreshTokenRepository.delete({
      expDtm: LessThan(now),
    });
    this.logger.debug(`Deleted ${result.affected} expired refresh tokens.`);
  }
}
