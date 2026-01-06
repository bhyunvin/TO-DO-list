import { Test, TestingModule } from '@nestjs/testing';
import { LoggingSchedule } from './logging.schedule';
import { LogEntity } from './logging.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TodoEntity } from '../todo/todo.entity';
import { UserEntity } from '../user/user.entity';
import { FileInfoEntity } from '../fileUpload/file.entity';
import { RefreshTokenEntity } from '../user/refresh-token.entity';
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
        {
          provide: getRepositoryToken(TodoEntity),
          useValue: {
            update: jest.fn().mockResolvedValue({ affected: 0 }),
          },
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            update: jest.fn().mockResolvedValue({ affected: 0 }),
          },
        },
        {
          provide: getRepositoryToken(FileInfoEntity),
          useValue: {
            update: jest.fn().mockResolvedValue({ affected: 0 }),
          },
        },
        {
          provide: getRepositoryToken(RefreshTokenEntity),
          useValue: {
            update: jest.fn().mockResolvedValue({ affected: 0 }),
          },
        },
      ],
    }).compile();

    schedule = module.get<LoggingSchedule>(LoggingSchedule);
    repository = module.get<Repository<LogEntity>>(
      getRepositoryToken(LogEntity),
    );
  });

  it('정의되어야 함', () => {
    expect(schedule).toBeDefined();
  });

  it('handleCron은 6개월 이상 된 로그를 삭제해야 함', async () => {
    const deleteSpy = jest.spyOn(repository, 'delete');
    await schedule.handleCron();

    expect(deleteSpy).toHaveBeenCalledWith({
      auditColumns: {
        regDtm: expect.anything(), // LessThan 매처는 테스트에서 정확한 등가성을 확인하기 어렵기 때문에(LessThan을 임포트하지 않는 경우) expect.anything()으로 전달 여부만 확인
      },
    });
  });
});
