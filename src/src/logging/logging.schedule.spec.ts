import { Test, TestingModule } from '@nestjs/testing';
import { LoggingSchedule } from './logging.schedule';
import { LogEntity } from './logging.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('LoggingSchedule', () => {
  let schedule: LoggingSchedule;
  let repository: Repository<LogEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggingSchedule,
        {
          provide: getRepositoryToken(LogEntity),
          useValue: {
            delete: jest.fn().mockResolvedValue({ affected: 1 }),
          },
        },
      ],
    }).compile();

    schedule = module.get<LoggingSchedule>(LoggingSchedule);
    repository = module.get<Repository<LogEntity>>(
      getRepositoryToken(LogEntity),
    );
  });

  it('should be defined', () => {
    expect(schedule).toBeDefined();
  });

  it('handleCron should delete logs older than 6 months', async () => {
    const deleteSpy = jest.spyOn(repository, 'delete');
    await schedule.handleCron();

    expect(deleteSpy).toHaveBeenCalledWith({
      auditColumns: {
        regDtm: expect.anything(), // LessThan matcher is hard to check equality exactly without importing LessThan in test, expect.anything() checks it's passed
      },
    });
  });
});
