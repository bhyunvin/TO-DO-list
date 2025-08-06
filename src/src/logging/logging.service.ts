import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogEntity } from './logging.entity';

@Injectable()
export class LoggerService {
  constructor(
    @InjectRepository(LogEntity)
    private readonly logRepository: Repository<LogEntity>,
  ) {}

  async log(logEntity: LogEntity): Promise<void> {
    await this.logRepository.save(logEntity);
  }
}
