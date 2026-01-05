import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LogEntity } from './logging.entity';
import { Repository, LessThan } from 'typeorm';

@Injectable()
export class LoggingSchedule {
  private readonly logger = new Logger(LoggingSchedule.name);

  constructor(
    @InjectRepository(LogEntity)
    private readonly logRepository: Repository<LogEntity>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    this.logger.debug('Running expired logs cleanup...');

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    try {
      const result = await this.logRepository.delete({
        auditColumns: {
          regDtm: LessThan(sixMonthsAgo),
        },
      });
      this.logger.debug(`Deleted ${result.affected} expired logs.`);
    } catch (error) {
      this.logger.error('Failed to delete expired logs', error.stack);
    }
  }
}
